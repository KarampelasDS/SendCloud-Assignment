from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.enums import ShipmentStatus
from app.models import Shipment
from app.queries import claim_due_shipments, mark_done, record_failure


def make_shipment(**overrides):
    defaults = {
        "fire_at": datetime.now(UTC),
        "status": ShipmentStatus.pending,
        "webhook_url": "https://example.com/webhook",
        "name": "Jane Doe",
        "city": "Amsterdam",
        "country": "NL",
        "shipping_preference": "fast",
        "insured": False,
    }
    return Shipment(**{**defaults, **overrides})


def test_claim_due_shipment(db_session):
    shipment = make_shipment(fire_at=datetime.now(UTC) - timedelta(minutes=5))
    db_session.add(shipment)
    db_session.commit()

    result = claim_due_shipments(db_session, datetime.now(UTC))
    assert len(result) == 1
    assert result[0].id == shipment.id
    assert result[0].status == ShipmentStatus.processing
    assert result[0].locked_at is not None


def test_claim_ignores_future_shipment(db_session):
    shipment = make_shipment(fire_at=datetime.now(UTC) + timedelta(minutes=5))
    db_session.add(shipment)
    db_session.commit()

    result = claim_due_shipments(db_session, datetime.now(UTC))
    assert len(result) == 0


def test_reclaims_stale_processing_shipment(db_session):
    stale_lock = datetime.now(UTC) - timedelta(
        seconds=200
    )  # our default is 100 in the actual queries file so this is wayyyy past that
    shipment = make_shipment(
        fire_at=datetime.now(UTC) - timedelta(minutes=5),
        status=ShipmentStatus.processing,
        locked_at=stale_lock,
    )
    db_session.add(shipment)
    db_session.commit()

    result = claim_due_shipments(db_session, datetime.now(UTC))

    assert len(result) == 1
    assert result[0].id == shipment.id
    assert result[0].status == ShipmentStatus.processing
    assert result[0].locked_at > stale_lock


def test_claim_does_not_reclaim_recent_processing_shipment(db_session):
    not_stale_lock = datetime.now(UTC) - timedelta(seconds=10)
    shipment = make_shipment(
        fire_at=datetime.now(UTC) - timedelta(minutes=5),
        status=ShipmentStatus.processing,
        locked_at=not_stale_lock,
    )
    db_session.add(shipment)
    db_session.commit()

    result = claim_due_shipments(db_session, datetime.now(UTC))
    assert len(result) == 0


def test_mark_done(db_session):
    shipment = make_shipment(
        fire_at=datetime.now(UTC) - timedelta(minutes=5),
        status=ShipmentStatus.processing,
        locked_at=datetime.now(UTC) - timedelta(minutes=5),
    )

    db_session.add(shipment)
    db_session.commit()

    current_time = datetime.now(UTC)

    mark_done(db_session, shipment, current_time)

    assert shipment.status == ShipmentStatus.done
    assert shipment.fired_at == current_time


def test_increase_attempt_on_fail(db_session):
    shipment = make_shipment(
        fire_at=datetime.now(UTC) - timedelta(minutes=5),
        status=ShipmentStatus.processing,
        locked_at=datetime.now(UTC) - timedelta(minutes=5),
        attempts=0,
    )

    db_session.add(shipment)
    db_session.commit()

    record_failure(db_session, shipment, max_attempts=5)
    assert shipment.attempts == 1
    assert shipment.status == ShipmentStatus.pending
    assert shipment.locked_at == None


def test_mark_fail(db_session):
    shipment = make_shipment(
        fire_at=datetime.now(UTC) - timedelta(minutes=5),
        status=ShipmentStatus.processing,
        locked_at=datetime.now(UTC) - timedelta(minutes=5),
        attempts=5,
    )

    db_session.add(shipment)
    db_session.commit()

    record_failure(db_session, shipment, max_attempts=5)
    assert shipment.status == ShipmentStatus.failed
    assert shipment.attempts == 5


def test_claim_skips_rows_locked_by_another_worker(db_session, other_session):
    shipment = make_shipment(fire_at=datetime.now(UTC) - timedelta(minutes=5))
    db_session.add(shipment)
    db_session.commit()

    locked = other_session.scalars(
        select(Shipment).where(Shipment.id == shipment.id).with_for_update()
    ).all()
    assert len(locked) == 1

    result = claim_due_shipments(db_session, datetime.now(UTC))

    assert result == []

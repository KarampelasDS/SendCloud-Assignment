from datetime import datetime, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.enums import ShipmentStatus
from app.models import Shipment


def claim_due_shipments(
    session: Session, now: datetime, limit: int = 100, visibility_timeout: int = 100
):
    stale_interval = now - timedelta(seconds=visibility_timeout)
    stmt = (
        select(Shipment)
        .where(
            or_(
                Shipment.status == ShipmentStatus.pending,
                and_(
                    Shipment.status == ShipmentStatus.processing,
                    Shipment.locked_at < stale_interval,
                ),
            ),
            Shipment.fire_at <= now,
        )
        .order_by(Shipment.fire_at)
        .limit(limit)
        .with_for_update(skip_locked=True)
    )

    shipments = list(session.scalars(stmt))

    for shipment in shipments:
        shipment.status = ShipmentStatus.processing
        shipment.locked_at = now

    session.commit()

    return shipments


def mark_done(session: Session, shipment: Shipment, now: datetime):
    shipment.status = ShipmentStatus.done
    shipment.fired_at = now
    session.commit()


def record_failure(session: Session, shipment: Shipment, max_attempts: int):
    if shipment.attempts < max_attempts:
        shipment.attempts += 1
        shipment.status = ShipmentStatus.pending
        shipment.locked_at = None
    else:
        shipment.status = ShipmentStatus.failed
    session.commit()

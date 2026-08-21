from datetime import datetime, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.enums import ShipmentStatus
from app.models import Shipment


def claim_due_shipments(
    session: Session, now: datetime, limit: int = 100, visibility_timeout: int = 100
):
    """Claim the shipments that are due to fire and mark them as processing.

    Rows are locked with ``FOR UPDATE SKIP LOCKED`` so that several workers can run
    this at the same time: each one skips rows another worker already holds instead
    of queueing behind them, and they end up splitting the due set between them.

    A shipment is claimable if it is still ``pending``, or if it is ``processing``
    but its ``locked_at`` is older than ``visibility_timeout`` seconds. The second
    case covers a worker that died mid delivery, and is what makes a crash
    recoverable without any separate recovery step. Shipments that were due while
    the service was down need no special handling either, since they are simply
    pending rows whose ``fire_at`` has passed.
    """
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
    """Record that a shipment's webhook was delivered successfully."""
    shipment.status = ShipmentStatus.done
    shipment.fired_at = now
    session.commit()


def record_failure(session: Session, shipment: Shipment, max_attempts: int):
    """Record a failed delivery, either for retry or as a final failure.

    Below ``max_attempts`` the shipment goes back to ``pending`` with its lock
    cleared, so the next poll picks it up again. Once the attempts are used up it
    is marked ``failed`` and left alone rather than retried forever.
    """
    if shipment.attempts < max_attempts:
        shipment.attempts += 1
        shipment.status = ShipmentStatus.pending
        shipment.locked_at = None
    else:
        shipment.status = ShipmentStatus.failed
    session.commit()

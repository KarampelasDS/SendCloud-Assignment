import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.enums import ShipmentExportReason, ShipmentShippingPreference, ShipmentStatus


class Base(DeclarativeBase):
    pass


class Shipment(Base):
    __tablename__ = "shipments"

    # webhook firing data
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fire_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[ShipmentStatus] = mapped_column(default=ShipmentStatus.pending)
    attempts: Mapped[int] = mapped_column(default=0)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    fired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    webhook_url: Mapped[str]

    # shipment data
    name: Mapped[str]
    telephone_number: Mapped[str | None]
    city: Mapped[str]
    country: Mapped[str]
    tax_number: Mapped[str | None]
    export_reason: Mapped[ShipmentExportReason | None]
    statements: Mapped[str | None]
    shipping_preference: Mapped[ShipmentShippingPreference]
    insured: Mapped[bool]

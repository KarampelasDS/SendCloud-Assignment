from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.enums import Country, ShipmentExportReason, ShipmentShippingPreference

customs_countries = Country.GB, Country.US

max_schedule_seconds = 40 * 24 * 60 * 60 #40 days


class NewScheduledShipment(BaseModel):
    name: str
    telephone_number: str | None = None
    city: str
    country: Country
    tax_number: str | None = None
    export_reason: ShipmentExportReason | None = None
    statements: str | None = None
    shipping_preference: ShipmentShippingPreference
    insured: bool
    hours: int = Field(ge=0)
    minutes: int = Field(ge=0)
    seconds: int = Field(ge=0)
    webhook_url: str

    @model_validator(mode="after")
    def require_customs(self):
        if self.country in customs_countries and (
            not self.tax_number or not self.export_reason
        ):
            raise ValueError("tax_number and export_reason are required for GB and US")
        return self

    @model_validator(mode="after")
    def limit_schedule(self):
        total_seconds = self.hours * 3600 + self.minutes * 60 + self.seconds
        if total_seconds > max_schedule_seconds:
            raise ValueError("Scheduled shipments cannot be more than 40 days into the future.")
        return self


class ScheduledShipmentResponse(BaseModel):
    id: UUID
    time_left: int

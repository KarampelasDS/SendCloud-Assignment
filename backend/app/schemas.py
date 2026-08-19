from uuid import UUID

from pydantic import BaseModel, Field, model_validator
from app.enums import Country, ShipmentExportReason, ShipmentShippingPreference

customs_countries = Country.GB, Country.US


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
        if self.country in customs_countries:
            if not self.tax_number or not self.export_reason:
                raise ValueError(
                    "tax_number and export_reason are required for the selected destination country"
                )
        return self


class ScheduledShipmentResponse(BaseModel):
    id: UUID
    time_left: int

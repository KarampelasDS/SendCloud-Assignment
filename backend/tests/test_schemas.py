import pytest
from pydantic import ValidationError

from app.enums import Country, ShipmentExportReason, ShipmentShippingPreference
from app.schemas import NewScheduledShipment


@pytest.fixture
def base_payload():
    return {
        "name": "Jane Doe",
        "telephone_number": "1234567890",
        "city": "Amsterdam",
        "country": Country.NL,
        "shipping_preference": ShipmentShippingPreference.fast,
        "insured": False,
        "hours": 0,
        "minutes": 0,
        "seconds": 0,
        "webhook_url": "https://example.com/webhook",
    }


customs_countries = Country.GB, Country.US


def test_valid_payload_no_customs(base_payload):
    shipment = NewScheduledShipment(**base_payload)
    assert shipment.country not in customs_countries


def test_valid_payload_with_customs(base_payload):
    payload = {
        **base_payload,
        "country": Country.US,
        "export_reason": ShipmentExportReason.gift,
        "tax_number": "123456790",
        "statements": "statement",
    }
    shipment = NewScheduledShipment(**payload)

    assert shipment.country in customs_countries


def test_us_missing_required_fields_raises(base_payload):
    payload = {**base_payload, "country": Country.US}

    with pytest.raises(ValidationError):
        NewScheduledShipment(**payload)


def test_us_missing_only_export_reason_raises(base_payload):
    payload = {**base_payload, "country": Country.US, "tax_number": "123456790"}
    with pytest.raises(ValidationError):
        NewScheduledShipment(**payload)


def test_negative_time_fields(base_payload):
    payload = {**base_payload, "hours": -1}
    with pytest.raises(ValidationError):
        NewScheduledShipment(**payload)


def test_schedule_at_the_limit_is_allowed(base_payload):
    payload = {**base_payload, "hours": 40 * 24, "minutes": 0, "seconds": 0}
    NewScheduledShipment(**payload)


def test_schedule_too_far_in_the_future_is_rejected(base_payload):
    payload = {**base_payload, "hours": 40 * 24, "minutes": 0, "seconds": 1}

    with pytest.raises(ValidationError):
        NewScheduledShipment(**payload)

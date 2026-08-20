import httpx

from app.config import settings
from app.models import Shipment


def fire_webhook(shipment: Shipment):
    payload = {
        "id": str(shipment.id),
        "name": shipment.name,
        "telephone_number": shipment.telephone_number,
        "city": shipment.city,
        "country": shipment.country,
        "tax_number": shipment.tax_number,
        "export_reason": shipment.export_reason,
        "statements": shipment.statements,
        "shipping_preference": shipment.shipping_preference,
        "insured": shipment.insured,
    }
    response = httpx.post(
        shipment.webhook_url,
        json=payload,
        timeout=settings.webhook_timeout_seconds,
    )
    response.raise_for_status()

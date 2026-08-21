import time
from datetime import UTC, datetime

import httpx

from app.config import settings
from app.db import SessionLocal
from app.queries import claim_due_shipments, mark_done, record_failure
from app.webhook import fire_webhook


def run():
    while True:
        now = datetime.now(UTC)
        with SessionLocal() as session:
            for shipment in claim_due_shipments(session, now):
                try:
                    print(f"Attempting to fire webhook for shipment: {shipment.id}", flush=True)
                    fire_webhook(shipment)
                    mark_done(session, shipment, now)
                    print(f"Fired shipment: {shipment.id}", flush=True)
                except httpx.HTTPError:
                    print(f"Failed to fire shipment: {shipment.id}", flush=True)
                    record_failure(session, shipment, settings.webhook_max_attempts)
        time.sleep(settings.poll_interval_seconds)


if __name__ == "__main__":
    print("Worker Started", flush=True)
    run()

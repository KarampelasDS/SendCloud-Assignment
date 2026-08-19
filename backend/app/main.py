from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Shipment
from app.schemas import NewScheduledShipment, ScheduledShipmentResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, err):
    return JSONResponse(status_code=400, content={"error": err.errors()[0]["msg"]})


@app.post("/shipments", response_model=ScheduledShipmentResponse)
def create_shipment(payload: NewScheduledShipment, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    fire_at = now + timedelta(
        hours=payload.hours, minutes=payload.minutes, seconds=payload.seconds
    )

    shipment = Shipment(
        fire_at=fire_at,
        webhook_url=payload.webhook_url,
        name=payload.name,
        telephone_number=payload.telephone_number,
        city=payload.city,
        country=payload.country,
        tax_number=payload.tax_number,
        export_reason=payload.export_reason,
        statements=payload.statements,
        shipping_preference=payload.shipping_preference,
        insured=payload.insured,
    )

    db.add(shipment)
    db.commit()

    time_left = max(0, int((fire_at - now).total_seconds()))
    return ScheduledShipmentResponse(id=shipment.id, time_left=time_left)


@app.get("/shipments/{id}", response_model=ScheduledShipmentResponse)
def get_shipment(id: UUID, db: Session = Depends(get_db)):
    shipment = db.get(Shipment, id)
    if shipment is None:
        return JSONResponse(
            status_code=404, content={"error": "No shipment with that id"}
        )

    now = datetime.now(timezone.utc)
    time_left = max(0, int((shipment.fire_at - now).total_seconds()))
    return ScheduledShipmentResponse(id=shipment.id, time_left=time_left)

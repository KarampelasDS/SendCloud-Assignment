from uuid import uuid4


def test_create_shipment_no_customs_valid(client):
    response = client.post(
        "/shipments",
        json={
            "name": "Jane Doe",
            "city": "Amsterdam",
            "country": "NL",
            "shipping_preference": "fast",
            "insured": False,
            "hours": 0,
            "minutes": 0,
            "seconds": 5,
            "webhook_url": "https://example.com/webhook",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert "id" in body
    assert body["time_left"] >= 0


def test_create_shipment_with_customs_invalid(client):
    response = client.post(
        "/shipments",
        json={
            "name": "Jane Doe",
            "city": "Amsterdam",
            "country": "US",
            "shipping_preference": "fast",
            "insured": False,
            "hours": 0,
            "minutes": 0,
            "seconds": 5,
            "tax_number": "123456789",
            "webhook_url": "https://example.com/webhook",
        },
    )

    assert response.status_code == 400


def test_create_shipment_with_customs_valid(client):
    response = client.post(
        "/shipments",
        json={
            "name": "Jane Doe",
            "city": "Amsterdam",
            "country": "US",
            "shipping_preference": "fast",
            "insured": False,
            "hours": 0,
            "minutes": 0,
            "seconds": 5,
            "tax_number": "123456789",
            "export_reason": "gift",
            "webhook_url": "https://example.com/webhook",
        },
    )
    assert response.status_code == 200


def test_get_shipment_info_valid(client):
    setup = client.post(
        "/shipments",
        json={
            "name": "Jane Doe",
            "city": "Amsterdam",
            "country": "NL",
            "shipping_preference": "fast",
            "insured": False,
            "hours": 0,
            "minutes": 0,
            "seconds": 5,
            "webhook_url": "https://example.com/webhook",
        },
    )

    shipment_id = setup.json()["id"]

    response = client.get(f"/shipments/{shipment_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == shipment_id
    assert 0 <= body["time_left"] <= 5


def test_get_shipment_not_found(client):
    fake_id = uuid4()

    response = client.get(f"/shipments/{fake_id}")

    assert response.status_code == 404
    assert response.json() == {"error": "No shipment with that id"}


def test_schedule_too_far_in_the_future_is_rejected(client):
    response = client.post("/shipments", json={
        "name": "Jane Doe",
        "city": "Amsterdam",
        "country": "NL",
        "shipping_preference": "fast",
        "insured": False,
        "hours": 10**9,
        "minutes": 0,
        "seconds": 5,
        "webhook_url": "https://example.com/webhook",
    })

    assert response.status_code == 400
    assert "error" in response.json()
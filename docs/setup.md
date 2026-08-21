# Setup

How to run the backend, the frontend, and the test suites.

## Prerequisites

- [Docker](https://www.docker.com/) to run the backend
- [Node.js](https://nodejs.org/) v22+ and npm v10+ to run the frontend
- [uv](https://docs.astral.sh/uv/) only needed to run the backend test suite

The app itself needs nothing installed locally beyond Docker/Node: dependencies are
installed inside the image. uv is only for running pytest on the host.

## Backend

From the `backend/` folder:

```bash
cp .env.example .env
docker compose up
```

The values in `.env.example` work as-is.

This starts:

| Service          | Role                                              |
| ---------------- | ------------------------------------------------- |
| `db`             | Postgres 17                                       |
| `create-test-db` | one-shot; creates the `shipments_test` database   |
| `migrate`        | one-shot; runs `alembic upgrade head`, then exits |
| `app`            | FastAPI on <http://localhost:8000>                |
| `worker`         | polls for due timers and fires webhooks           |
| `adminer`        | database viewer on <http://localhost:8080>        |

`app` and `worker` both wait for `migrate` to finish, so the schema always exists before
either starts.

Interactive API docs: <http://localhost:8000/docs>

Note: Postgres is published on port 5433 instead of the default 5432 to avoid clashing with local installations.

### Inspecting the database

Adminer is included so the database is easy to look at while reviewing. Open
<http://localhost:8080> and log in with:

| Field    | Value       |
| -------- | ----------- |
| System   | PostgreSQL  |
| Server   | `db`        |
| Username | `shipments` |
| Password | `shipments` |
| Database | `shipments` |

Server is `db` rather than `localhost`, because Adminer runs inside the compose network and
reaches Postgres by its service name.

### Backend tests

Testing the backend requires docker compose to be running, as it tests actual operations against a test database. The claim query relies on `FOR UPDATE SKIP LOCKED`, which an in-memory database cannot model.

```bash
uv sync
uv run pytest
```

## Frontend

From the `frontend/` folder:

```bash
npm install
cp .env.example .env
```

Fill in your own webhook URL in the new `.env` file, you can get one at [webhook.site](https://webhook.site). Then:

```bash
npm start
```

Open <http://localhost:5173>.

Note: Vite reads `.env` at startup, so restart the dev server after changing it.

| Variable           | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `VITE_API_URL`     | Where the form POSTs; matches the backend above |
| `VITE_WEBHOOK_URL` | The fixed `webhook_url` sent with each shipment |

### Frontend tests

```bash
npm test
```

## Trying it end to end

1. Get a fresh URL from [webhook.site](https://webhook.site) and put it in `frontend/.env`.
2. Fill in the form, schedule it a short time ahead, and submit.
3. Run `docker compose logs -f worker` to watch the worker fire in real time.
4. The POST body appears on the webhook.site page.
5. Optionally, `GET /shipments/{id}` with the id of the new shipment returns the time left until it fires.

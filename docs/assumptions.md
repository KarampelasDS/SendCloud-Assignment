# Assumptions and trade-offs

This document covers the decisions I made where the spec was silent, the delivery guarantees
the system actually provides, and where I drew the line on "production-ready".

## Assumptions

**Timers are scheduled at most 40 days ahead.** The spec didn't specifically ask for this, but leaving it
unbounded has a real cost: a large `hours` value overflowed `timedelta` in the backend and produced a 500 response
instead of the expected 400. The limit exists to make absurd input a clean client error. 40 days is fine enough but
the point is that a limit exists, and the exact number would normally be a product decision.

**The scheduling control converts an absolute date/time into a relative duration.** The API
takes `hours`/`minutes`/`seconds` from now, but people just don't think like that when scheduling something ("send it
Friday at 9"). The form offers a date-time picker and converts to a duration during submission. The
duration is resolved once, at request time, so no timezone information crosses the wire.

This was quite a big decision for me to make, as I chose to prioritize UX and the actual usability of the frontend
because that is way more important to me. Having, for example, 3 separate inputs (hours, minutes, seconds) and asking
the user to fill that in felt extremely troublesome, so that's why I opted for the calendar approach instead. I think
this is a very reasonable action to take, as the conversion back into a duration still happens on the client side.

**`webhook_url` is fixed app configuration, not user input**, per the spec. It comes from
`VITE_WEBHOOK_URL` on the frontend.

**There is no authentication or rate limiting** on either endpoint. I considered it as out of scope for the
exercise, but it means anything can create timers pointed at any URL.

**Completed shipments are kept indefinitely.** Nothing archives or prunes them. See
[scaling.md](scaling.md) for why that becomes the first real problem at volume.

**The service assumes a single logical database.** Everything below rests on Postgres being
the one source of truth for what is scheduled and what has fired.

## Webhook delivery guarantees

The spec asks that each timer fires exactly once. What this system provides is **at-least-once
delivery with a stable idempotency key**, which is the strongest honest guarantee available
across a network boundary.

The reason is that the webhook is an HTTP call to a system that I don't control. The database
transaction is deliberately not held open across that call because doing so would hold row locks for
the duration of a remote request, and a slow or hanging receiver would stall the worker and
block other workers behind it. So the sequence is: claim the row and commit, make the HTTP
call, then mark the row done in a separate transaction.

That leaves a window. If the process dies after the receiver has accepted the POST but before
`mark_done` commits, the row is still `processing`, the visibility timeout eventually expires,
another worker reclaims it, and the webhook fires a second time. Narrowing that window is
possible but closing it is not as there is no atomic commit spanning my database and someone
else's HTTP endpoint.

Two things make this safe in practice:

- The payload includes the shipment `id`, which never changes across retries.
  A receiver that keys on it can discard duplicates. This is the standard resolution: at-least-once on the
  wire, exactly-once in effect, with deduplication at the consumer level.
- The row is saved before the webhook is ever called. So the worst case is the same webhook
  arriving twice, never a shipment that silently doesn't fire.

Failed deliveries are retried on subsequent polls up to `WEBHOOK_MAX_ATTEMPTS` (default 5),
after which the row is marked `failed` and left alone rather than retried forever.

## Timing and latency

The worker polls the db every `POLL_INTERVAL_SECONDS` (default 1s), so a webhook can fire up to
roughly a second after its `fire_at`. That delay is a deliberate trade. There's nothing to reconnect
to and no in-memory state to rebuild, so a restart doesn't need recovery logic at all. A timer that
expired while the service was down is simply a `pending` row with `fire_at <= now()`,
indistinguishable from one that just came due.

If millisecond precision mattered, the poll interval is a config value, and the trade would be
more empty queries against the database.

A worker that dies mid-delivery leaves its row `processing` with a `locked_at` timestamp.
After the visibility timeout (100s) another worker reclaims it. So a crash costs at most that
delay. It never costs the webhook.

## Validation

The same rules are enforced on both sides, independently, because they answer different
questions. Client-side validation is UX: the date picker is bounded with `min` and `max` so
out-of-range dates can't be selected, and inline messages explain what's wrong before the user
submits. Server-side validation is the contract: it runs regardless of what client is talking
to it, and it's what actually decides whether a shipment is accepted.

`tax_number` and `export_reason` are required when the country is `GB` or `US`. Something worth noting
here is that the spec is one-directional about this: it says these are _required if_ the country is GB or US,
not that they are _forbidden otherwise_. Supplying them for other countries is accepted and
ignored, which is what the contract describes.

## Design notes

**The scheduling control is not in the Figma**, so I designed it. It features two buttons that control
Immediate Shipment vs Schedule for later, revealing a date-time picker when the latter is chosen, with
a plain-language summary line that always states what will happen. The picker is bounded to
the valid window, so the common path can't produce an invalid value at all.

**The Country field is marked required in the OpenAPI contract but had no asterisk in the
design.** I added the asterisk so the field's appearance matches its behaviour and the rest of
the required fields, as this could be quite frustrating for the user.

## Production readiness

The spec says "production-ready, whatever that means to you", so I want to be explicit
about which parts are and aren't.

What holds up: timers are durable and survive restarts; the claim query is safe under
concurrency and is the same mechanism that lets the worker scale horizontally; migrations run
as a gated step that must succeed before the API or the worker start, which is how a real
deployment sequences them, deliveries are only marked done when the receiver returns a success status.

What doesn't, and would need to change:

- Credentials are hardcoded in `docker-compose.yml`. Real deployments inject secrets.
- The test-database service ships in the same compose file as the application. In production it wouldn't
  exist at all: provisioning a test database belongs in CI, against an instance that's created for the run
  and thrown away afterwards. It's here because it makes the suite runnable with one command (and because it's convenient).
- The `/docs` endpoint stands in for a health check. A real one would verify database connectivity rather
  than just that the process is listening.
- The worker doesn't handle `SIGTERM`. A `docker stop` during its sleep kills it.
  The visibility timeout means no webhook is lost, but a production worker would drain first.
- There are no metrics. Firing lag and the depth of the due-but-unclaimed queue are the two
  numbers I'd want before anything else, see [scaling.md](scaling.md).
- Adminer is exposed on port 8080 with no authentication. It's there so the database is easy to
  inspect while reviewing, and it would not ship anywhere real.

Compose is a development tool, not a deployment target. What this setup does is model the
right _sequencing_; the operational concerns above are what separate it from a real one.

## With more time

- Graceful shutdown in the worker, so a deploy drains in-flight deliveries instead of
  relying on the reaper.
- A real `/health` endpoint that checks the database.
- Metrics: firing lag (`fired_at - fire_at`), queue depth, webhook failure rate.
- Exponential backoff between retries, rather than retrying on the next poll regardless.
- Retention or partitioning for completed shipments.
- An end-to-end test that runs the worker against a live HTTP receiver, rather than testing
  the claim logic and the webhook call separately.

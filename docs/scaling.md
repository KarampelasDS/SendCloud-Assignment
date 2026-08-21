# Running on several servers at 100 timer creations/second

What I would change to go from one API instance and one worker to something that handles
roughly 100 timer creations per second across several servers, and in what order I'd do it.

In short: the current design already scales further than it looks, because the way rows are
claimed was chosen with multiple workers in mind, taking a significant part of the scaling workload away.
The parts that need real work are the size of the table and the constant polling, not the writes.

## How it works right now

Timers are rows in the database, not timers held in memory. Each shipment stores the exact
time it should fire (`fire_at`, in UTC) along with `status`, `attempts` and `locked_at`.

A worker checks the table once a second and claims everything that is due
([`claim_due_shipments`](../backend/app/queries.py)):

```sql
WHERE (status = 'pending' OR (status = 'processing' AND locked_at < now() - visibility_timeout))
  AND fire_at <= now()
ORDER BY fire_at
LIMIT 100
FOR UPDATE SKIP LOCKED
```

Claimed rows are marked `processing` with a `locked_at` timestamp. If a worker dies, its rows
sit there until `locked_at` is old enough that the same query picks them back up, which is what
makes a crash recoverable.

The index on `fire_at` only covers rows that are still `pending`, so the query never has to look
through shipments that have already fired.

## Where 100/second actually lands

**Writing is not the problem.** `POST /shipments` inserts one row. There is nothing to look up
and nothing to wait for, and Postgres handles that easily. The API also keeps nothing in memory
between requests, so I can run several copies of it behind a load balancer without them needing
to know about each other. At 100/sec the writes are unremarkable.

**The size of the table is the problem.** 100 rows a second is about 8.6 million rows a day, and
nothing ever deletes them. The index keeps the worker's query fast for a while, because it only
covers pending rows. But the table itself keeps growing, and a database is only fast while the
data it uses regularly still fits in memory. Once it doesn't, everything starts hitting disk and
slows down.

**The constant polling is the second problem.** Every worker runs the same query every second.
With one worker that's nothing. With twenty it's twenty queries a second against the same rows,
and when things are quiet almost all of them come back empty.

## Step 1: more workers, more API instances

The API keeps no state, so I'd just run more copies of it behind a load balancer. Nothing else
changes.

The workers already scale, and that's the whole point of `FOR UPDATE SKIP LOCKED`. When a worker
claims a row it locks it. Another worker that runs into a locked row **skips past it** and takes
the next one instead, so they divide the work between them without talking to each other. Without
`SKIP LOCKED` they would queue up waiting for whoever holds the row, and twenty workers would get
you the throughput of one.

There are two settings here and they pull against each other:

- **How many rows a worker takes at once** (`LIMIT`, currently 100). Taking more means fewer
  queries, but a worker that dies is sitting on more rows until its lock goes stale.
- **How often it checks** (currently every second). Checking more often means webhooks fire
  closer to on time, but more queries that find nothing.

This step goes a long way on its own, and it's cheap because the locking was already set up for
it.

## Step 2: take pressure off the database

- **A read-only copy of the database for `GET /shipments/{id}`.** That endpoint only reads, and
  it doesn't matter if the copy is a moment behind. The worker's claim query can't use a copy,
  because it locks and updates rows.
- **Delete or archive old shipments.** This is the one that actually matters at 8.6M rows a day.
  Either split the table by date so old sections can be dropped in one go, or move finished
  shipments to a separate history table. Either way the main table stays about the size of the
  timers still waiting, instead of every timer ever created.
- **Share database connections** (with something like PgBouncer). Postgres allows a limited
  number of open connections. With enough workers and API instances you run out of connections
  long before the database is actually working hard, so you put something in front of it that
  shares a smaller pool between them.

## Step 3: the fork in the road

After that there are two directions, and which one is right depends on where it hurts.

**Split the data across several databases**, by shipment id or by customer. Each one works
exactly the way it does now, and its workers only poll their own database. This is the
conservative option since nothing about the mechanism changes. The cost is that something has to
know which database a shipment lives in, moving data around when one grows faster gets awkward,
and any question about all shipments at once now has to be asked several times.

**Move scheduling to a message broker**, like RabbitMQ's delayed messages. The appeal is that
nothing polls at all: you hand the broker a message and it delivers it when it's due. Some
things I would insist on though:

- The database stays the source of truth. Saving the shipment and sending it to the broker are
  two separate systems, so if the save works and the send fails, the shipment exists but never
  fires. The fix is to write the shipment and a "still needs sending" record in the same
  transaction, then have a separate process read that record and publish it. Both happen or
  neither does. Without that, I'd have traded a one second delay for shipments that silently
  disappear, which is a much worse problem.
- Broker delays aren't really built for long waits, so I'd keep the database row anyway for
  anything scheduled far ahead.

## Step 4: or hand it to something built for this

There are services whose entire job is durable timers, Temporal being the obvious one. They
solve this properly and out of the box. The trade is a fairly big piece of infrastructure to
run and understand, for a service whose entire job is one table and a loop.

I wouldn't reach for it at 100/sec. I'm listing it because it's worth knowing where the polling
model stops paying for itself, and that's a very long way past this volume.

## What I'd measure first

None of the above should happen just by guessing. These are the numbers that tell you which wall
you're hitting:

- **How late webhooks actually fire** (`fired_at - fire_at`). If most are on time but a few are
  very late, the workers aren't keeping up during busy spells, which points at Step 1. If
  everything is slowing down evenly, that's the database rather than the workers.
- **How many shipments are due but not claimed yet** (`fire_at <= now()` and `status = 'pending'`).
  That should sit at zero. If it climbs and stays up, the workers can't keep up at all.
- **How long the claim query takes**, tracked over time. If it slowly gets worse, that's the
  table growing, which points at Step 2.
- **How often webhooks fail and get retried**, so I can tell "my scheduler is behind" apart from
  "the receiver is down". Without this the first number gets misread as the second.

The steps above are roughly cheapest first, and each one has a number that justifies doing it.

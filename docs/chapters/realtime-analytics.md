## What problem it solves

Every other tool in this book does something to data you give it. This one
watches the site itself.

The question it answers is not analytical, it is architectural: **how do you get
an event from a visitor's browser onto a dashboard, live, without polling?**
Nearly every analytics page in the world answers that with a timer — ask the
server every five seconds whether anything happened. That works, and it is
wasteful in a specific way: almost every request returns "nothing new", and the
data you are looking at is on average two and a half seconds stale.

This dashboard has no timer. A row is inserted into PostgreSQL and the database
pushes it to the open browser. The number on screen changes because something
happened, not because a clock ticked.

## How it works, step by step

**The write path — three hops:**

1. A visitor opens a page or a tool. The browser posts a small JSON object to
   `/api/track`.
2. That route runs on the server, adds the visitor's country from the CDN's own
   header, and inserts a row into the `events` table in Supabase PostgreSQL.
3. PostgreSQL's replication stream notices the insert.

**The read path — no request at all:**

4. The dashboard, on load, opens a **WebSocket** to Supabase Realtime and
   subscribes to `INSERT` on `public.events`.
5. When a row lands, the database pushes it down that socket.
6. The browser prepends it to the live feed and **updates every statistic
   locally** without asking the server for anything.

## The model or algorithm

No model. The interesting parts are the transport and one piece of client-side
state management.

### Why this is not polling

Polling means the client asks repeatedly. It is simple, it works everywhere, and
it has two costs: a request per interval per open tab whether or not anything
happened, and latency equal to half the interval on average.

What replaces it here is **PostgreSQL's logical replication**. Postgres already
writes every change to a write-ahead log so it can recover from a crash and feed
replicas. Logical decoding turns that log into a stream of readable change
events. Supabase Realtime reads that stream, matches each change against what
open clients have subscribed to, and pushes matching rows down their WebSockets.

The consequence worth stating: **the dashboard is driven by the database's own
durability mechanism.** The event reaches the browser because it was committed,
not because anything polled for it. Nothing extra is written to make it work.

### The tracking endpoint runs server-side, for one specific reason

The insert cannot happen from the browser, because the write needs the Supabase
**service-role key** — a credential that bypasses row-level security. Shipping
that to the client would let anyone write anything into the table.

So `/api/track` is a server route. The browser posts to it with no credential at
all; the route holds the key in a server-only environment variable and does the
insert.

Note the asymmetry, because it is the whole security design:

| Direction | Credential | Why it is safe |
|---|---|---|
| **Write** | service-role key, server-only | never leaves the server |
| **Read** | anon key, in the browser | read-only, and the table is public data |

Two keys with two power levels, and the powerful one never crosses the network
to a client.

**The country comes from a header, not from the client.** `CF-IPCountry` or
`x-vercel-ip-country`, set by the CDN. A browser-supplied country would be a
value the visitor controls; an edge-supplied one is not.

The endpoint also sets permissive CORS headers, with an `OPTIONS` handler, so
events can be posted from the other deployed apps in this project rather than
only from this site.

### The optimistic dashboard update

This is the part with the most engineering in it, and it is easy to miss.

When a new event arrives, the dashboard does **not** re-fetch its statistics. It
recomputes them in the browser from the single row that just arrived:

- `today_count` increments
- the current hour's bucket in `per_minute` increments, or is created
- the event's path is found in `top_pages` and incremented, or appended — then
  the list is re-sorted and re-trimmed to ten
- `by_type` is updated the same way
- the funnel counter for `page_view`, `tool_open` or `query_run` steps up
- the feed keeps the newest **50** events, the chart the last **30** buckets

Every one of those is an immutable update — a new array, a new object — because
React needs a changed reference to re-render.

There is also a guard that is the sort of thing that only shows up in use:

```ts
if (range !== "today") return;
```

If you are looking at last week, a live event still joins the feed but **must
not** be added to the statistics, because it is not inside the range those
statistics describe. Without that line, browsing a historical range would slowly
corrupt its own totals with today's traffic. Live updates have to respect the
filter the user is looking through.

### The funnel

Three event types in a deliberate order: `page_view` → `tool_open` →
`query_run`. That is the drop-off worth measuring on this site — how many
visitors arrive, how many open a tool, how many actually run something. Each
step is a much stronger signal of interest than the one before it.

## Why these choices

**Why a WebSocket rather than polling.** Zero requests when nothing happens,
and no staleness when something does. On a low-traffic site the difference in
load is the whole point: polling costs the same whether traffic is zero or
constant.

**Why update statistics client-side instead of re-fetching.** A re-fetch per
event turns a push architecture back into a request-per-event one, which is
worse than polling under load. The dashboard already holds the aggregate; the
new row is a delta.

**Why Supabase rather than a self-managed Postgres.** Realtime, the WebSocket
infrastructure, connection pooling and row-level security come as one managed
piece. Building the same thing means running a logical-replication consumer and
a WebSocket fan-out service — considerably more moving parts than this site
justifies.

**Why store `meta` as JSON.** Different event types carry different payloads —
which tool, which model won, how many rows. A schema per type would need a
migration each time a tool is added. A JSON column takes whatever a tool sends.
The trade is that nothing validates its shape.

## How to read the output

- **The live feed is the newest 50 events.** It is a window, not a log.
- **The funnel is the metric that means something.** Page views measure reach;
  `query_run` measures whether anyone actually used the thing.
- **Counts update optimistically.** What you see is the dashboard's arithmetic
  on the events it has received since load, added to the totals it fetched at
  load. Refreshing re-reads from the database.
- **Country comes from the CDN's geo-IP header**, so a VPN reads as its exit
  country and a missing header reads as blank.
- **Nothing arriving is a real observation.** A quiet feed means a quiet site,
  not a broken socket — the connection state is separate.
- **Switch ranges and the statistics stop moving.** That is the range guard,
  not a stall.

## Limits

- **Session identity is a client-generated id.** Cleared site data is a new
  visitor; two browsers are two visitors.
- **No bot filtering.** Crawlers count as page views.
- **The `meta` column is unvalidated.** Whatever a tool sent is what is stored.
- **Optimistic updates can drift** from the database — a dropped WebSocket
  message is not reconciled until reload.
- **`/api/track` has no authentication or rate limiting.** Anyone who finds the
  endpoint can post events; the write is confined to one table with a fixed
  shape, but the numbers are not tamper-proof.
- **The service-role key bypasses row-level security**, so the route's
  validation is the only thing standing between a request and the table.
- **Only three event types** feed the funnel.
- **Realtime is per-table `INSERT`.** No aggregation server-side; the browser
  does the arithmetic.
- **This is product analytics, not a data warehouse.** No sessionisation, no
  retention cohorts, no attribution.

## Likely interview questions

**"How does the dashboard update without polling?"**
Postgres already writes every change to its write-ahead log for durability.
Logical decoding turns that log into a stream of change events; Supabase
Realtime reads the stream and pushes matching rows to clients over WebSockets
based on what they subscribed to. So the dashboard is driven by the database's
own durability mechanism — the row reaches the browser because it was committed,
not because anything asked.

**"Why can't the browser insert directly into the database?"**
Because the insert needs the service-role key, which bypasses row-level
security. Any credential in client JavaScript is public. So the write goes
through a server route that holds the key in a server-only environment variable,
and the browser reads with the anon key, which is read-only. Two credentials
with two power levels, and the powerful one never reaches a client.

**"Why recompute the statistics in the browser instead of re-fetching?"**
A re-fetch per event turns a push architecture back into request-per-event,
which is worse than polling once traffic picks up. The client already holds the
aggregate and the new row is a delta, so incrementing is both correct and free.
The cost is that the client's numbers can drift from the database if a message
is dropped, and a reload reconciles it.

**"What's the subtle bug in live-updating a filtered dashboard?"**
Applying a live event to statistics for a range it does not belong to. If
someone is looking at last week and today's events keep incrementing those
totals, the view quietly becomes wrong. There is an explicit guard — the event
still joins the feed, but the statistics only update when the selected range is
today. Any live view over a filtered dataset has this problem.

**"What would you fix first?"**
The tracking endpoint. It is unauthenticated and unrate-limited, so the numbers
are not tamper-proof — I would add rate limiting by IP and a shared secret or
signed payload from the known callers. After that, bot filtering, because
crawler traffic inflates page views without touching the funnel and makes the
conversion rate look worse than it is.

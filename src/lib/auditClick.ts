/** Crash-durable click audit — client half (Plan #1).
 *
 * The problem this solves: a plain `fetch` fired on click is lost if the tab,
 * browser, or OS dies before the request reaches the network. For an AUDIT
 * record ("did this user actually click Save?") that loss is the whole ballgame.
 *
 * The guarantee here is three-staged, strongest first:
 *   1. LOCAL FIRST (synchronous) — the record is written to a localStorage
 *      outbox the instant the click happens, BEFORE any network call. A
 *      synchronous local write survives a tab/browser/OS crash; only power loss
 *      in the microsecond between click and write can beat it.
 *   2. KEEPALIVE SEND — delivery uses `fetch(..., { keepalive: true })`, which
 *      the browser finishes even as the page unloads (navigation, tab close).
 *   3. FLUSH ON LOAD + DEDUPE — anything the server never acked is re-sent on
 *      the next page load. Every record carries a client-minted `event_uuid`,
 *      so the server upserts on it and a re-sent-but-already-delivered click is
 *      never double-counted.
 *
 * An entry leaves the outbox only on an *acked* keepalive send. The unload path
 * (`sendBeacon`) is best-effort and deliberately does NOT clear the outbox — the
 * next load's flush reconciles, and the server dedupe makes the re-send free.
 *
 * Content-free, like the rest of our logging (LOGGING_SPEC §6): a stable control
 * id (`data-audit="save-btn"`), the path, the session, a timestamp — never the
 * value of any field, never typed text.
 */

const OUTBOX_KEY = "_ml_audit_outbox";
const MAX_OUTBOX = 500; // cap so a persistent server outage can't grow it unbounded

export interface AuditRecord {
  event_uuid: string;
  control: string;
  path: string;
  session_id: string;
  client_ts: number; // epoch ms, set in the browser at click time
  meta?: Record<string, unknown>;
}

function sessionId(): string {
  try {
    let id = localStorage.getItem("_ml_session");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("_ml_session", id);
    }
    return id;
  } catch {
    return "";
  }
}

function readOutbox(): AuditRecord[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as AuditRecord[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(records: AuditRecord[]): void {
  try {
    // Keep the newest if we ever exceed the cap (oldest unsent are least useful).
    const capped = records.length > MAX_OUTBOX ? records.slice(-MAX_OUTBOX) : records;
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(capped));
  } catch {
    /* storage full / blocked — nothing more we can do client-side */
  }
}

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

/** Stage 1: write the click to the local outbox synchronously, then (stage 2)
 * try to deliver it. Returns the record so callers/tests can inspect it. */
export function enqueueAudit(control: string, meta?: Record<string, unknown>): AuditRecord {
  const rec: AuditRecord = {
    event_uuid: uuid(),
    control,
    path: typeof location !== "undefined" ? location.pathname : "",
    session_id: sessionId(),
    client_ts: Date.now(),
    ...(meta ? { meta } : {}),
  };
  const box = readOutbox();
  box.push(rec);
  writeOutbox(box); // synchronous — survives a crash from here on
  // Fire the delivery but never block the click handler on it.
  void flushAuditOutbox();
  return rec;
}

let inFlight = false;

/** Stage 3: re-send everything still in the outbox and clear what the server
 * acks. Idempotent and safe to call repeatedly (on load, after each enqueue). */
export async function flushAuditOutbox(): Promise<void> {
  if (inFlight) return;
  const box = readOutbox();
  if (box.length === 0) return;
  inFlight = true;
  try {
    const res = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ records: box }),
    });
    if (!res.ok) return; // leave the outbox intact; next flush retries
    const data = (await res.json().catch(() => ({}))) as { delivered?: string[] };
    // Clear exactly what the server confirmed (or all, if it didn't enumerate).
    const delivered = new Set(data.delivered ?? box.map((r) => r.event_uuid));
    const remaining = readOutbox().filter((r) => !delivered.has(r.event_uuid));
    writeOutbox(remaining);
    // Re-arm: clicks that arrived DURING this send were skipped by the inFlight
    // guard, so after a successful send flush again to deliver them promptly
    // (a burst of clicks otherwise waits for the next click or page load). Only
    // on success, so a network outage doesn't become a busy-loop.
    if (remaining.length > 0) {
      // finally (below) clears inFlight first, so this re-flush runs unguarded.
      setTimeout(() => void flushAuditOutbox(), 0);
    }
  } catch {
    /* network down — records stay in the outbox for the next flush */
  } finally {
    inFlight = false;
  }
}

/** Unload path: hand the outbox to the browser with sendBeacon, which survives
 * the page going away. Best-effort — it does NOT clear the outbox, so the next
 * load's flush reconciles and the server dedupe makes the re-send harmless. */
export function beaconAuditOutbox(): void {
  try {
    const box = readOutbox();
    if (box.length === 0) return;
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([JSON.stringify({ records: box })], { type: "application/json" });
      navigator.sendBeacon("/api/audit", blob);
    }
  } catch {
    /* beacon unavailable — the outbox persists for the next load */
  }
}

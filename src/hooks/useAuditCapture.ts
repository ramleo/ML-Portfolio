"use client";
import { useEffect } from "react";
import { enqueueAudit, flushAuditOutbox, beaconAuditOutbox } from "@/lib/auditClick";
import { describeClick } from "@/lib/clickDescriptor";

/** Crash-durable click audit — the global wiring (Plan #1 + "any click" #2).
 *
 * One capture-phase click listener (the same single-listener pattern as
 * useFeatureCapture / installUploadLogging) records EVERY click on an interactive
 * element — a button, link, input, or anything with a role/onclick — tagged or
 * not. A `data-audit="<id>"` is used as the control id when present (highest
 * confidence); otherwise a stable, content-free descriptor is derived from the
 * element's structure (see clickDescriptor.ts). Clicks on plain text/background
 * are not recorded.
 *
 * On mount it flushes anything a previous session left undelivered, and it
 * beacons the outbox on unload — so the full three-stage guarantee in
 * auditClick.ts is live site-wide from one mount in AnalyticsTracker.
 */
export function useAuditCapture() {
  useEffect(() => {
    // Stage 3 on arrival: deliver whatever a crashed/closed prior page left behind.
    void flushAuditOutbox();

    const onClick = (e: MouseEvent) => {
      const desc = describeClick(e.target as Element | null);
      if (!desc) return; // non-interactive click — not recorded
      // §5b: the password tool stays out of every log.
      if (typeof location !== "undefined" && location.pathname.includes("password")) return;
      // A tagged control may carry an enumerated choice via data-audit-value
      // (e.g. which row's Save). Still enumerated, never free text.
      const anchor = (e.target as Element | null)?.closest<HTMLElement>("[data-audit]");
      const value = anchor?.dataset.auditValue;
      enqueueAudit(desc.control, { ...desc.meta, ...(value !== undefined ? { value } : {}) });
    };

    const onHide = () => {
      // Belt-and-suspenders: flush via beacon when the page is being hidden or
      // torn down, so a close mid-click still delivers.
      if (document.visibilityState === "hidden") beaconAuditOutbox();
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", beaconAuditOutbox);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", beaconAuditOutbox);
    };
  }, []);
}

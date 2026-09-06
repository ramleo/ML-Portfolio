"use client";

import { useEffect } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { trackedFetch } from "@/lib/trackedFetch";

export default function KeepAlive() {
  useEffect(() => {
    // Fires every 4 minutes per open tab (~15 rows/hour/tab). Recorded under
    // its own tool name so it can be excluded from any query that counts
    // real activity.
    const ping = () => trackedFetch(`${ML_UNIFIED_API}/health`, { method: "GET" },
      { tool: "keepalive" }).catch(() => {});
    ping();
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}

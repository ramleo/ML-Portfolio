"use client";

import { useEffect } from "react";
import { ML_UNIFIED_API } from "@/config/urls";
import { installSessionEnd } from "@/lib/sessionTracking";
import { installDownloadTracking } from "@/lib/downloadTracking";
import { installUploadLogging } from "@/lib/securityLog";
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
    // §3 stage 8. Mounted here because this component is already in the root
    // layout and runs on every page — it is the only global client hook that
    // exists, so adding a second one just to hold a listener would be worse.
    const removeSessionEnd = installSessionEnd();
    const removeDownloads = installDownloadTracking();
    const removeUploads = installUploadLogging();
    return () => { clearInterval(id); removeSessionEnd(); removeDownloads(); removeUploads(); };
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";
import { ML_UNIFIED_API } from "@/config/urls";

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch(`${ML_UNIFIED_API}/health`, { method: "GET" }).catch(() => {});
    ping();
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}

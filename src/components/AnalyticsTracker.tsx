"use client";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function AnalyticsTracker() {
  useAnalytics("page_view");
  return null;
}
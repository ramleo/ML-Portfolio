"use client";
import { useAnalytics, useScrollDepth, usePasteInput, useErrorTracking } from "@/hooks/useAnalytics";

export default function AnalyticsTracker() {
  useAnalytics("page_view");
  useScrollDepth();     // §12 step 6
  usePasteInput();      // §12 step 5
  useErrorTracking();   // stage 7: global uncaught errors
  return null;
}
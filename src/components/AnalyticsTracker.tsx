"use client";
import { useAnalytics, useScrollDepth, usePasteInput, useErrorTracking, useFeatureCapture } from "@/hooks/useAnalytics";
import { useAuditCapture } from "@/hooks/useAuditCapture";

export default function AnalyticsTracker() {
  useAnalytics("page_view");
  useScrollDepth();     // §12 step 6
  usePasteInput();      // §12 step 5
  useErrorTracking();   // stage 7: global uncaught errors
  useFeatureCapture();  // feature-level: per-control interactions (data-ev/data-wt)
  useAuditCapture();    // crash-durable click audit (data-audit) — Plan #1
  return null;
}
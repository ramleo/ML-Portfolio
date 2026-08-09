/** Tampering's confidence is a statistical-outlier score (ELA/noise-residual
 * deviation, see mm_tampering.py), not a trained classifier's probability —
 * a bare "100%" reads as near-certain to a viewer when it isn't. Bucketing
 * into High/Medium/Low (same convention the Groundedness badge already
 * uses) is more honest about what this number actually represents. Shared
 * by CitationThumbnailPanel's on-image badge and CitationResultsPanel's
 * region list so the two can't drift out of sync. */
export function tamperingLevel(confidence: number): "High" | "Medium" | "Low" {
  return confidence >= 0.75 ? "High" : confidence >= 0.45 ? "Medium" : "Low";
}
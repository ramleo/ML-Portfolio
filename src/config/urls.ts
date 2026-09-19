if (!process.env.NEXT_PUBLIC_ML_UNIFIED_URL) {
  console.warn("NEXT_PUBLIC_ML_UNIFIED_URL is not set. API calls will fail. Set this to your backend URL (Render, HF Spaces, Railway, localhost, etc.)");
}

export const ML_UNIFIED_API    = (process.env.NEXT_PUBLIC_ML_UNIFIED_URL    ?? "").replace(/\/$/, "");
export const ML_SQL_API        = (process.env.NEXT_PUBLIC_ML_SQL_URL        ?? "").replace(/\/$/, "");
export const ML_ANALYTICS_API  = (process.env.NEXT_PUBLIC_ML_ANALYTICS_URL  ?? "").replace(/\/$/, "");

// The Testwright QA platform. Defaults to the shared ML-Unified backend today;
// when the /qa/* API is extracted into its own microservice, point the whole
// world at it by setting NEXT_PUBLIC_QA_API_URL — no code change needed.
export const QA_API            = (process.env.NEXT_PUBLIC_QA_API_URL ?? ML_UNIFIED_API).replace(/\/$/, "");
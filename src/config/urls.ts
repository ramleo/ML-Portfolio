if (!process.env.NEXT_PUBLIC_ML_UNIFIED_URL) {
  console.warn("NEXT_PUBLIC_ML_UNIFIED_URL is not set. API calls will fail. Set this to your backend URL (Render, HF Spaces, Railway, localhost, etc.)");
}

export const ML_UNIFIED_API = (process.env.NEXT_PUBLIC_ML_UNIFIED_URL ?? "").replace(/\/$/, "");
export const ML_SQL_API     = (process.env.NEXT_PUBLIC_ML_SQL_URL     ?? "").replace(/\/$/, "");
import type { Metadata } from "next";

const title = "AutoML Pipeline | AIRaML";
const description =
  "Upload a CSV and four models — Random Forest, XGBoost, LightGBM and CatBoost — compete via 5-fold cross-validation. The winner is picked automatically on F1 or MAE.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

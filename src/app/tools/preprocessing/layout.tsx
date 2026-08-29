import type { Metadata } from "next";

const title = "Data Preprocessing & Cleaning | AIRaML";
const description =
  "Profile a CSV for missing values, outliers and skew, then apply imputation, encoding and scaling with a live data-quality score — every transform shown before it is applied.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

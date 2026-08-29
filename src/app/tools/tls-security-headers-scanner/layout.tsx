import type { Metadata } from "next";
import { toolMetadata } from "@/lib/toolMetadata";

export const metadata: Metadata = toolMetadata("tls-security-headers-scanner");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

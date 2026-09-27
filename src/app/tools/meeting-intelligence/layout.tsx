import type { Metadata } from "next";
import { toolMetadata } from "@/lib/toolMetadata";

export const metadata: Metadata = toolMetadata("meeting-intelligence");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

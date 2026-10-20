"use client";

import { createContext } from "react";

/** The navbar avatar used to appear only after the page's JS hydrated and the
 * client fetched /api/me — a visible gap on every full load. The root layout now
 * reads a small, non-sensitive `airaml_me` cookie (kept fresh by NavAuth) server-
 * side and seeds this context, so NavAuth can render the real avatar in the SSR
 * HTML — painted before any JS runs — with no per-page DB or auth round-trip.
 * `undefined` = unknown (first-ever visit); the real auth stays in the httpOnly
 * Supabase cookies, so this display hint carries no privilege. */
export interface Me {
  email: string | null;
  role?: string;
  isOwner?: boolean;
  avatarUrl?: string | null;
}

export const IdentityContext = createContext<Me | null | undefined>(undefined);

export default function IdentityProvider({ value, children }: { value: Me | null | undefined; children: React.ReactNode }) {
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

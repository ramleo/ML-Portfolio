import { useCallback, useMemo, useState } from "react";
import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

let zxcvbnInstance: InstanceType<typeof ZxcvbnFactory> | null = null;
function getZxcvbn() {
  if (!zxcvbnInstance) {
    zxcvbnInstance = new ZxcvbnFactory({
      dictionary: {
        ...zxcvbnCommonPackage.dictionary,
        ...zxcvbnEnPackage.dictionary,
      },
      graphs: zxcvbnCommonPackage.adjacencyGraphs,
      translations: zxcvbnEnPackage.translations,
    });
  }
  return zxcvbnInstance;
}

export type StrengthResult = {
  score: 0 | 1 | 2 | 3 | 4;
  warning: string | null;
  suggestions: string[];
  crackTimeDisplay: string;
};

export type BreachState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "clean" }
  | { status: "pwned"; count: number }
  | { status: "error"; message: string };

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

/** SHA-1 is required here because it's HIBP's own Pwned Passwords API
 * contract (k-anonymity range lookup) — not a general security
 * recommendation. Only the first 5 hex chars of the hash are ever sent;
 * the full password and full hash never leave the browser. */
async function sha1Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return toHex(digest);
}

/** Real technique (zxcvbn, the same pattern-matching algorithm behind
 * Dropbox's and many real password meters) for strength scoring, plus an
 * on-demand k-anonymity breach lookup against Have I Been Pwned's Pwned
 * Passwords API. Nothing about the password is persisted anywhere — no
 * localStorage, no backend call of any kind for either check. */
export function usePasswordAudit() {
  const [password, setPassword] = useState("");
  const [breach, setBreach] = useState<BreachState>({ status: "idle" });

  const strength: StrengthResult | null = useMemo(() => {
    if (!password) return null;
    const result = getZxcvbn().check(password);
    return {
      score: result.score,
      warning: result.feedback.warning || null,
      suggestions: result.feedback.suggestions,
      crackTimeDisplay: result.crackTimes.offlineSlowHashingXPerSecond.display,
    };
  }, [password]);

  const checkBreach = useCallback(async () => {
    if (!password) return;
    setBreach({ status: "checking" });
    try {
      const hash = await sha1Hex(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error("lookup failed");
      const text = await res.text();
      const line = text.split("\n").find(l => l.split(":")[0]?.trim().toUpperCase() === suffix);
      if (line) {
        const count = parseInt(line.split(":")[1]?.trim() || "0", 10);
        setBreach({ status: "pwned", count });
      } else {
        setBreach({ status: "clean" });
      }
    } catch {
      setBreach({ status: "error", message: "Breach check unavailable right now — try again in a moment." });
    }
  }, [password]);

  const reset = useCallback(() => {
    setPassword("");
    setBreach({ status: "idle" });
  }, []);

  return { password, setPassword, strength, breach, checkBreach, reset };
}

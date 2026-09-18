"use client";

import { useCallback, useRef, useState } from "react";
import { track, incrementQueryCount } from "@/hooks/useAnalytics";
import { EV } from "@/lib/logEvents";
import {
  decodeJwt, runChecks, crackSecret, type DecodedJwt, type Finding,
} from "./jwtChecks";
import { WEAK_SECRETS, parseWordlist } from "./weakSecrets";

interface CrackState {
  status: "idle" | "running" | "done";
  tried: number;
  total: number;
  secret: string | null; // the cracked secret, or null if not found
}

const IDLE_CRACK: CrackState = { status: "idle", tried: 0, total: 0, secret: null };

/** Decodes a JWT, runs the security checks, and — for HMAC tokens — tries to
 *  crack the signing secret against the bundled demo list plus any wordlist the
 *  user pastes. Everything runs in the browser; the token is never sent
 *  anywhere and is never logged. Only the fact that an analysis ran is logged
 *  (to close the client-side "runs aren't tracked" gap). */
export function useJwtAnalyzer() {
  const [decoded, setDecoded] = useState<DecodedJwt | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [crack, setCrack] = useState<CrackState>(IDLE_CRACK);
  const runId = useRef(0);

  const reset = useCallback(() => {
    runId.current++;
    setDecoded(null); setFindings([]); setError(null); setCrack(IDLE_CRACK);
  }, []);

  const analyze = useCallback(async (token: string, customWordlistText?: string) => {
    const myRun = ++runId.current;
    setError(null); setCrack(IDLE_CRACK);

    let d: DecodedJwt;
    try {
      d = decodeJwt(token);
    } catch (e) {
      setDecoded(null); setFindings([]);
      setError(e instanceof Error ? e.message : "Could not parse this token.");
      return;
    }

    // Usage logging — the action only, never the token content.
    incrementQueryCount("jwt-analyzer");
    track(EV.QUERY_RUN, { meta: { tool: "jwt-analyzer", alg: d.alg || "none" } });

    setDecoded(d);
    setFindings(runChecks(d));

    // HMAC crack (HS*). Asymmetric/none tokens have no shared secret to crack.
    const isHmac = /^HS(256|384|512)$/.test(d.alg);
    if (!isHmac) return;

    const custom = customWordlistText ? parseWordlist(customWordlistText) : [];
    // De-dupe while keeping the bundled defaults first.
    const wordlist = Array.from(new Set([...WEAK_SECRETS, ...custom]));
    setCrack({ status: "running", tried: 0, total: wordlist.length, secret: null });

    const result = await crackSecret(d, wordlist, (tried) => {
      if (runId.current === myRun) setCrack((c) => ({ ...c, tried }));
    });
    if (runId.current !== myRun) return; // a newer run superseded this one

    setCrack({ status: "done", tried: result.tried, total: wordlist.length, secret: result.secret });
    setFindings((prev) => [...prev, crackFinding(result.secret, wordlist.length)]);
  }, []);

  return { decoded, findings, error, crack, analyze, reset };
}

function crackFinding(secret: string | null, listSize: number): Finding {
  if (secret !== null) {
    return {
      severity: "critical",
      title: "Weak signing secret — cracked",
      detail: `The token's HMAC signature was reproduced with the secret "${secret}". Anyone who guesses this can forge valid tokens with any claims they like (e.g. role: admin). Rotate to a long, random secret immediately.`,
    };
  }
  return {
    severity: "ok",
    title: "Secret not in the wordlist",
    detail: `None of the ${listSize.toLocaleString()} candidates tried reproduced the signature. That's a good sign, but it does NOT prove the secret is strong — it only means it isn't in this list. Paste a larger wordlist to test further.`,
  };
}

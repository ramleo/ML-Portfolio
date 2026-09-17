import { describe, it, expect } from "vitest";
import { checkAiToolsRequest, MAX_OUTPUT_TOKENS } from "./aiToolsLimits";

const base = { provider: "claude", messages: [{ role: "user", content: "hi" }] };

describe("checkAiToolsRequest", () => {
  it("rejects empty or non-array messages (400)", () => {
    expect(checkAiToolsRequest({ ...base, messages: [] })).toMatchObject({ ok: false, status: 400 });
    expect(checkAiToolsRequest({ ...base, messages: "x" })).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects too many messages (400)", () => {
    const messages = Array.from({ length: 21 }, () => ({ role: "user", content: "x" }));
    expect(checkAiToolsRequest({ ...base, messages })).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects non-string content (400)", () => {
    expect(checkAiToolsRequest({ ...base, messages: [{ role: "user", content: 1 }] })).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects total message chars over the cap (413)", () => {
    expect(checkAiToolsRequest({ ...base, messages: [{ role: "user", content: "x".repeat(50_001) }] })).toMatchObject({ ok: false, status: 413 });
  });

  it("rejects oversized toolContext (413)", () => {
    expect(checkAiToolsRequest({ ...base, toolContext: "x".repeat(20_001) })).toMatchObject({ ok: false, status: 413 });
  });

  it("on the site's key, refuses a model the tools don't use (400)", () => {
    expect(checkAiToolsRequest({ ...base, model: "claude-opus-5" })).toMatchObject({ ok: false, status: 400 });
  });

  it("on the site's key, allows a whitelisted model", () => {
    expect(checkAiToolsRequest({ ...base, model: "claude-haiku-4-5-20251001" }).ok).toBe(true);
  });

  it("with the caller's own key, allows any model", () => {
    expect(checkAiToolsRequest({ ...base, model: "claude-opus-5", userKey: "sk-abc" }).ok).toBe(true);
  });

  it("clamps maxTokens to the ceiling, defaults on invalid, keeps valid", () => {
    const hi = checkAiToolsRequest({ ...base, maxTokens: 999_999 });
    expect(hi.ok && hi.maxTokens).toBe(MAX_OUTPUT_TOKENS);
    const def = checkAiToolsRequest({ ...base, maxTokens: "abc" });
    expect(def.ok && def.maxTokens).toBe(800);
    const mid = checkAiToolsRequest({ ...base, maxTokens: 1500 });
    expect(mid.ok && mid.maxTokens).toBe(1500);
  });
});

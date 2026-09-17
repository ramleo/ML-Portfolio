import { describe, it, expect } from "vitest";
import { boundConversation } from "./chatLimits";

describe("boundConversation", () => {
  it("rejects a non-array or empty input (400)", () => {
    expect(boundConversation(null)).toMatchObject({ status: 400 });
    expect(boundConversation([])).toMatchObject({ status: 400 });
  });

  it("rejects a message without string content (400)", () => {
    expect(boundConversation([{ role: "user", content: 123 }])).toMatchObject({ status: 400 });
  });

  it("refuses a single oversized message (413)", () => {
    expect(boundConversation([{ role: "user", content: "x".repeat(4001) }])).toMatchObject({ status: 413 });
  });

  it("normalizes unknown roles to user, keeps assistant", () => {
    const r = boundConversation([{ role: "system", content: "a" }, { role: "assistant", content: "b" }]);
    if (!("messages" in r)) throw new Error("expected messages");
    expect(r.messages).toEqual([{ role: "user", content: "a" }, { role: "assistant", content: "b" }]);
  });

  it("keeps only the last 20 turns", () => {
    const raw = Array.from({ length: 25 }, (_, i) => ({ role: "user", content: `m${i}` }));
    const r = boundConversation(raw);
    if (!("messages" in r)) throw new Error("expected messages");
    expect(r.messages).toHaveLength(20);
    expect(r.messages[0].content).toBe("m5"); // 0..4 dropped
  });

  it("drops oldest messages until under the 20k total-chars budget", () => {
    // 3900 each stays under the 4k per-message cap; 6 of them (23.4k) exceeds
    // the 20k total, so the oldest is dropped.
    const raw = Array.from({ length: 6 }, () => ({ role: "user", content: "x".repeat(3900) }));
    const r = boundConversation(raw);
    if (!("messages" in r)) throw new Error("expected messages");
    expect(r.messages.length).toBeLessThan(6);
    expect(r.messages.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(20_000);
  });

  it("ensures the kept conversation opens with a user turn", () => {
    const r = boundConversation([{ role: "assistant", content: "a" }, { role: "user", content: "b" }]);
    if (!("messages" in r)) throw new Error("expected messages");
    expect(r.messages[0].role).toBe("user");
  });
});

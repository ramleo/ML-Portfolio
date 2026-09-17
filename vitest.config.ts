import { defineConfig } from "vitest/config";

// Unit tests for pure logic in src/lib (limit math, run-outcome classification).
// Node environment — these functions touch no DOM. Test files are co-located as
// src/**/*.test.ts and excluded from the Next build (see tsconfig "exclude").
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

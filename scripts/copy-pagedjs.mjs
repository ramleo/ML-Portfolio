/**
 * Copies Paged.js's prebuilt bundle into public/vendor so the handbook can load
 * it as a plain script.
 *
 * Importing pagedjs through the bundler fails at runtime — its handler
 * registration throws "s.call is not a function" once Next has processed the
 * ESM build. The prebuilt UMD bundle has no such problem. Copied at build time
 * rather than committed, so the file in public always matches the version in
 * package.json instead of being a stale checked-in copy nobody updates.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "pagedjs", "dist", "paged.min.js");
const to = join(root, "public", "vendor", "paged.min.js");

await mkdir(dirname(to), { recursive: true });
await copyFile(from, to);
console.log("copied paged.min.js -> public/vendor/");

/** Every tool card on the site, in one list.
 *
 *  The cards live in four files by domain — see _types.ts for why. Importers
 *  are unchanged: this still default-exports the flat array and re-exports the
 *  Capability type, so `import capabilities from "@/data/capabilities"` and
 *  `import type { Capability } from "@/data/capabilities"` both still resolve.
 *
 *  scripts/build-handbook.py and scripts/thumbnails.py read these files
 *  directly rather than importing them, so they read the whole directory.
 */
import mlPipeline from "./pipeline";
import computerVision from "./vision";
import languageDocuments from "./documents";
import securityTrust from "./security";

export type { Capability } from "./_types";
export { GITHUB } from "./_types";

const capabilities = [
  ...mlPipeline,
  ...languageDocuments,
  ...computerVision,
  ...securityTrust,
];

export default capabilities;

/** The shape of one tool card. Kept apart from the cards themselves so the
 *  lists can be split by domain without four files each re-declaring it. */
import type { LucideIcon } from "lucide-react";

export type Capability = {
  id: string;
  domain: string;      // groups the capability into a section on the homepage
  title: string;
  subtitle: string;       // badge pill top-left  (e.g. "4-Model Competition")
  description: string;
  accent: string;
  icon: LucideIcon;       // card glyph — a real, tool-specific icon, not a letter fallback
  stat: string;           // big value top-right  (e.g. "4", "10+", "∞")
  statLabel: string;      // label under stat     (e.g. "Models", "Transforms")
  model: string;          // MODEL meta row
  input: string;          // dataset / input row  (shown with DB icon)
  tags: string[];
  link: string;
  github: string;
  modalEnabled?: boolean;   // true = "Run Here" button opens inline modal
  internalLink?: string;    // internal Next.js route — shows "Try it", navigates client-side
  /**
   * Rank (1 = first) in the "Featured work" row shown above the full grid.
   * A visitor skimming for under a minute sees depth here before breadth
   * below; leave undefined for everything that isn't a flagship. Change the
   * line-up by moving this one field between tools — no component edits.
   */
  featured?: number;
};

export const GITHUB = "https://github.com/ramleo/ML-Unified";

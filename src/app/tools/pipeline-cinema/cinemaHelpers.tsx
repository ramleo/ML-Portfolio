// CSV parsing + transport-control icons for the Pipeline Cinema page, split out
// to keep page.tsx under the file-length limit.

export function parseCsvB64(b64: string): string[] {
  try {
    const text = atob(b64);
    return text
      .split("\n")[0]
      .split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function parseCsvPreview(b64: string, maxRows = 5): { columns: string[]; rows: string[][] } {
  try {
    const text = atob(b64);
    const lines = text.split("\n").filter(Boolean);
    const columns = lines[0].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1, maxRows + 1).map((line) =>
      line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
    );
    return { columns, rows };
  } catch {
    return { columns: [], rows: [] };
  }
}

/* Transport icons. Inline SVG rather than the play, pause and stop glyphs these
   buttons used to carry: those render as full-colour emoji on some platforms
   and as bare typographic marks on others, and neither takes the button's own
   colour. */
const Icon = ({ d }: { d: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
       aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
export const PlayIcon = () => <Icon d="M6 4l14 8-14 8z" />;
export const PauseIcon = () => <Icon d="M7 4h4v16H7zM13 4h4v16h-4z" />;
export const StopIcon = () => <Icon d="M5 5h14v14H5z" />;

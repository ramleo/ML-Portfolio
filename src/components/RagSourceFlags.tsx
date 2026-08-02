"use client";

const ENTITY_COLOR: Record<string, string> = {
  money: "#34d399", date: "#60a5fa", percent: "#fbbf24",
  person: "#f472b6", org: "#c084fc", location: "#38bdf8",
};

type Props = {
  numberMismatch?: boolean;
  blurry?: boolean;
  piiList: string[];
  entities?: { type: string; value: string }[] | null;
};

// entities.py caps 4 per type, but with 6 types (money/date/percent/person/
// org/location) that's up to 24 chips on one chunk — a technical-heavy chunk
// (résumés, ML writeups) can trip spaCy into tagging jargon like "ROC" or
// "XGBoost Classifier" as an org, burying the entities actually worth
// showing. Cap the total shown, and truncate any one value so a long
// misfire doesn't wrap into a giant pill next to one-word chips.
const _MAX_ENTITIES_SHOWN = 8;
const _MAX_ENTITY_VALUE_LEN = 28;

/** The expanded-card warning badges (number mismatch / maybe-blurry / PII)
 * and entity chips — split out of RagSourceCard.tsx to stay under the
 * project's file-length limit. Purely presentational, no state of its own. */
export default function RagSourceFlags({ numberMismatch, blurry, piiList, entities }: Props) {
  return (
    <>
      {(numberMismatch || blurry || piiList.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
          {numberMismatch && (
            <span
              title="This figure's AI description and a separate OCR reading disagree on at least one number — verify the exact value against the original."
              style={{
                display: "flex", alignItems: "center", gap: "2px",
                fontSize: "0.72rem", fontWeight: 700, color: "#f87171",
                background: "#f8717118", borderRadius: 9999,
                padding: "1px 6px", flexShrink: 0,
              }}>
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Verify number
            </span>
          )}
          {blurry && (
            <span
              title="Low-sharpness signal from a quick edge-detail scan — the caption/OCR for this image may be less reliable than usual. A heuristic, not a certainty."
              style={{
                display: "flex", alignItems: "center", gap: "2px",
                fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8",
                background: "#94a3b818", borderRadius: 9999,
                padding: "1px 6px", flexShrink: 0,
              }}>
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" />
              </svg>
              Maybe blurry
            </span>
          )}
          {piiList.length > 0 && (
            <span
              title={`Detected: ${piiList.join(", ")} — this document's own text contains this, be mindful before sharing a screenshot.`}
              style={{
                display: "flex", alignItems: "center", gap: "2px",
                fontSize: "0.72rem", fontWeight: 700, color: "#fbbf24",
                background: "#fbbf2418", borderRadius: 9999,
                padding: "1px 6px", flexShrink: 0,
              }}>
              <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v4H8a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1V4a3 3 0 0 0-3-3z" />
              </svg>
              Contains {piiList.join(", ")}
            </span>
          )}
        </div>
      )}
      {entities && entities.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem" }}>
          {entities.slice(0, _MAX_ENTITIES_SHOWN).map((e, i) => {
            const color = ENTITY_COLOR[e.type] ?? "#94a3b8";
            const truncated = e.value.length > _MAX_ENTITY_VALUE_LEN;
            const label = truncated ? `${e.value.slice(0, _MAX_ENTITY_VALUE_LEN)}…` : e.value;
            return (
              <span key={i} title={truncated ? e.value : undefined} style={{
                fontSize: "0.74rem", fontWeight: 600, color,
                background: `${color}18`, borderRadius: 9999, padding: "1px 6px",
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            );
          })}
          {entities.length > _MAX_ENTITIES_SHOWN && (
            <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text3)", padding: "1px 6px" }}>
              +{entities.length - _MAX_ENTITIES_SHOWN} more
            </span>
          )}
        </div>
      )}
    </>
  );
}
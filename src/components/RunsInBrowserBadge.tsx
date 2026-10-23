/**
 * "runs in browser" status pill for tool headers. Shared so the ~identical inline
 * spans that were copy-pasted into individual tool pages (and drifted) are one
 * thing. white-space:nowrap keeps it on one line when a busy header squeezes it
 * (it used to wrap to "runs in / browser").
 */
export default function RunsInBrowserBadge({ label = "runs in browser" }: { label?: string }) {
  return (
    <span
      style={{
        fontSize: "0.7rem",
        color: "#34d399",
        background: "rgba(52,211,153,0.1)",
        border: "1px solid rgba(52,211,153,0.25)",
        borderRadius: 9999,
        padding: "1px 8px",
        whiteSpace: "nowrap",
        flexShrink: 0,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

"use client";

/** Shared third-party ownership confirmation. Shown only when the target URL is
 *  not first-party; the action button stays disabled until it's checked. The
 *  backend enforces the same gate — this is the UX half. */
export default function OwnershipGate({ show, checked, onChange, accent }: {
  show: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent: string;
}) {
  if (!show) return null;
  return (
    <label className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[12px] leading-relaxed cursor-pointer"
      style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)", color: "var(--text2)" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 shrink-0" style={{ accentColor: accent }} />
      <span>
        <span className="font-semibold" style={{ color: "var(--text)" }}>Third-party site.</span>{" "}
        I own this site or am authorized to test it. Running tests against sites you don&apos;t own may
        breach their terms of service.
      </span>
    </label>
  );
}

"use client";

import { useRef } from "react";
import { usePpeCompliance, type PpeStatus } from "./usePpeCompliance";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

const STATUS_COPY: Record<PpeStatus, { text: string; color: string }> = {
  present: { text: "Present", color: "#34d399" },
  missing: { text: "Missing", color: "#f87171" },
  unclear: { text: "Unclear", color: "#9ca3af" },
};

function StatusPill({ label, status, confidence }: { label: string; status: PpeStatus; confidence: number | null }) {
  const s = STATUS_COPY[status];
  return (
    <div className="flex items-center gap-2 text-xs">
      <span style={{ color: "var(--text3)" }}>{label}:</span>
      <span className="font-semibold" style={{ color: s.color }}>
        {s.text}{confidence != null ? ` (${Math.round(confidence * 100)}%)` : ""}
      </span>
    </div>
  );
}

export default function PpeComplianceRunner({ accent }: { accent: string }) {
  const { preview, setImage, reset, run, running, result, error } = usePpeCompliance();
  const inputRef = useRef<HTMLInputElement>(null);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-glass)", border: "1px solid var(--border)", borderRadius: 16,
  };

  const onFileSelected = async (file: File) => setImage(await readFileAsDataUrl(file));

  return (
    <div className="flex flex-col gap-4">
      <div style={cardStyle} className="p-5">
        <p className="text-xs mb-1" style={{ color: "var(--text3)" }}>
          Upload a photo and this detects each person and checks whether a hard hat and safety vest are
          visible on them, using a dedicated PPE-detection model (the site&apos;s general object detector
          has no safety-vest class at all).
        </p>
        <p className="text-xs mb-4 font-semibold" style={{ color: accent }}>
          Compliance is only reported when the model explicitly detects the item present OR explicitly
          detects it absent — a person the model can&apos;t confidently read either way is labeled
          &quot;unclear,&quot; never guessed. Per-person attribution uses a head/torso spatial heuristic,
          not real person tracking.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => inputRef.current?.click()}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
            style={{ background: accent, color: "#fff" }}>
            Choose photo
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) onFileSelected(e.target.files[0]); e.target.value = ""; }} />
          {preview && (
            <button onClick={reset} className="text-xs underline" style={{ color: "var(--text3)" }}>Clear</button>
          )}
        </div>

        {preview && (
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, not a static asset */}
            <img src={preview} alt="Upload" className="rounded-lg max-w-[160px]" style={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
            <button onClick={run} disabled={running}
              className="text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
              style={{ background: accent, color: "#fff", opacity: running ? 0.6 : 1 }}>
              {running ? "Checking…" : "Check compliance"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#f87171" }}>{error}</p>}

      {result && (
        <div style={cardStyle} className="p-5 flex flex-col gap-4">
          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs" style={{ color: "#f59e0b" }}>⚠ {w}</li>
              ))}
            </ul>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element -- base64 preview from API response, not a static asset */}
          <img src={`data:image/jpeg;base64,${result.annotated_image}`} alt="Annotated result" className="w-full rounded-lg" style={{ background: "#000" }} />

          {result.people.length > 0 ? (
            <div className="flex flex-col gap-3">
              {result.people.map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg flex-wrap" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                    Person {i + 1} ({Math.round(p.person_confidence * 100)}%)
                  </span>
                  <StatusPill label="Hard hat" status={p.hardhat} confidence={p.hardhat_confidence} />
                  <StatusPill label="Safety vest" status={p.safety_vest} confidence={p.safety_vest_confidence} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text3)" }}>No person detected in this photo.</p>
          )}

          {result.unattributed.length > 0 && (
            <p className="text-[10px]" style={{ color: "var(--text3)" }}>
              Also detected but not attributed to a specific person: {result.unattributed.map(u => u.label).join(", ")}.
            </p>
          )}
        </div>
      )}

      <div className="text-xs leading-relaxed rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text3)" }}>
        <strong style={{ color: "var(--text2)" }}>What this doesn&apos;t do:</strong> this is not a
        certified safety-compliance system. Per-person item attribution is a spatial heuristic (head/torso
        region overlap with each detected person), not real tracking — a crowded or overlapping-people
        photo can misattribute an item to the wrong person. &quot;Unclear&quot; means the model didn&apos;t
        confidently detect the item present or absent, not that compliance is confirmed either way.
      </div>
    </div>
  );
}

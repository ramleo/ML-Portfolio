"use client";

import type { RevisionCandidate } from "./_types";

const displayName = (source: string) => source.replace(/^user:/, "").replace(/:[a-f0-9]{8}$/, "");

type Props = {
  newSource: string;
  old: RevisionCandidate;
  accent: string;
  onReplace: () => void;
  onKeepBoth: () => void;
};

export default function RevisionPromptBanner({ newSource, old, accent, onReplace, onKeepBoth }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px] px-3 py-2 rounded-lg"
      style={{ background: `${accent}10`, border: `1px solid ${accent}30`, color: "var(--text2)" }}>
      <span>
        {displayName(newSource)} looks like {old.reason === "same_filename"
          ? "the same file as" : "a revised version of"} &quot;{old.filename}&quot;, already in
        this chat. Replace the old one, or keep both?
      </span>
      <button onClick={onReplace} className="ml-auto px-2 py-1 rounded border shrink-0"
        style={{ borderColor: `${accent}40`, color: accent }}>
        Replace old
      </button>
      <button onClick={onKeepBoth} className="px-2 py-1 rounded shrink-0" style={{ color: "var(--text2)" }}>
        Keep both
      </button>
    </div>
  );
}
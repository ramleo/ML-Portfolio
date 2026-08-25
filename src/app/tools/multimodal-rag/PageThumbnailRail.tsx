"use client";

const ACCENT = "#a78bfa";

type Props = {
  pageImages: string[];
  activePage: number | null;
  onSelect: (page: number) => void;
};

/** Vertical strip of every page in the uploaded document, independent of
 * which citation is active — lets a user browse the whole file, not just
 * whichever page the chat happened to cite. Hidden for single-page/image
 * uploads where there's nothing else to browse. */
export default function PageThumbnailRail({ pageImages, activePage, onSelect }: Props) {
  if (pageImages.length <= 1) return null;

  return (
    <div className="flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto pr-0 sm:pr-0.5 sm:w-[88px] sm:max-h-[480px]">
      <span className="text-[8px] font-bold uppercase tracking-wide px-0.5 shrink-0" style={{ color: "var(--text3)" }}>
        Pages
      </span>
      {pageImages.map((img, i) => {
        const pageNum = i + 1;
        const active = pageNum === activePage;
        return (
          <button key={i} onClick={() => onSelect(pageNum)}
            className="rounded-lg overflow-hidden border text-left shrink-0 transition-colors max-sm:w-14"
            style={{ borderColor: active ? ACCENT : "var(--border)" }}>
            <img src={`data:image/png;base64,${img}`} alt={`Page ${pageNum}`}
              className="w-full block" style={{ height: 64, objectFit: "cover", background: "var(--bg)" }} />
            <div className="text-[8px] text-center py-0.5"
              style={{ background: active ? `${ACCENT}22` : "var(--border)", color: active ? ACCENT : "var(--text3)" }}>
              {pageNum}
            </div>
          </button>
        );
      })}
    </div>
  );
}
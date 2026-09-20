"use client";

import { VISION_ACCENT } from "../theme";

const STEPS = [
  { n: "01", h: "Pick a task", p: "Choose Classification (what is this?), Detection (what's where?) or Segmentation (which pixels are what?)." },
  { n: "02", h: "Upload an image", p: "Drop in an image or use a sample. It's resized to each model's input size automatically. For classification, pick a backbone — or run several to compare." },
  { n: "03", h: "Read the result", p: "Ranked labels with confidence (classify), boxes over the image (detect), or a coloured pixel overlay with a class legend (segment)." },
];

const CAN = [
  "Classification across 1000 ImageNet classes",
  "Four backbones to compare — MobileNetV2, ResNet50, SqueezeNet, GoogLeNet",
  "Object detection over 80 COCO classes (TinyYOLOv3)",
  "Pixel-level segmentation over 150 ADE20K classes (SegFormer-B0)",
  "Real ONNX models on a FastAPI backend",
  "One microservice shared with ML Unified + EDA",
];

const CANT = [
  "Fixed label sets — only names things in ImageNet / COCO / ADE20K",
  "Compact models tuned for speed on CPU, not maximum accuracy",
  "Expect misses on small, crowded or unusual scenes",
  "General-purpose — not medical, security or inspection grade",
  "Uploaded images are processed for the result, not kept",
];

export default function VisionHowScope() {
  return (
    <>
      <section style={{ background: "var(--bg-soft, var(--bg-card))", borderBlock: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>How it works</p>
          <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-6" style={{ color: "var(--text)" }}>
            Pick → upload → read
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px,100%),1fr))" }}>
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl p-[18px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="font-mono text-sm font-semibold" style={{ color: VISION_ACCENT }}>{s.n}</div>
                <h3 className="text-[15px] font-bold mt-1" style={{ color: "var(--text)" }}>{s.h}</h3>
                <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: "var(--text2)" }}>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text3)" }}>Honest scope</p>
        <h2 className="text-2xl font-extrabold tracking-tight mt-2 mb-1.5" style={{ color: "var(--text)" }}>
          Real models, with the caveats stated
        </h2>
        <p className="text-[15px] max-w-2xl" style={{ color: "var(--text2)" }}>
          Three real vision tasks on real ONNX models — compact models on fixed label sets, built to
          show the shape of practical vision, not to be a specialised system.
        </p>
        <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px,100%),1fr))" }}>
          <ScopeCard title="What it does" tag="Live" tagColor="#34d399" items={CAN} mark="✓" markColor="#34d399" />
          <ScopeCard title="What to keep in mind" tag="Caveats" tagColor="#94a3b8" items={CANT} mark="—" markColor="#94a3b8" />
        </div>
      </section>
    </>
  );
}

function ScopeCard({ title, tag, tagColor, items, mark, markColor }: {
  title: string; tag: string; tagColor: string; items: string[]; mark: string; markColor: string;
}) {
  return (
    <div className="rounded-2xl p-[18px]" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-[15px] font-bold flex items-center gap-2 mb-3" style={{ color: "var(--text)" }}>
        <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ color: tagColor, border: `1px solid ${tagColor}70`, background: `${tagColor}18` }}>{tag}</span>
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it} className="text-[13px] leading-relaxed pl-6 relative" style={{ color: "var(--text2)" }}>
            <span className="absolute left-0 font-bold" style={{ color: markColor }}>{mark}</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

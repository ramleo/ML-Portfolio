"use client";

import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { useRouter } from "next/navigation";
import { cropToBlob, type PixelArea } from "@/lib/cropImage";

/** Change-photo control for the Account page: pick an image, crop/zoom it to a
 * circle, upload it. Writes go through /api/avatar (server + service-role). On
 * success it tells the navbar to refresh via a window event. */
export default function AvatarEditor({ initialUrl, email }: { initialUrl: string | null; email: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [src, setSrc] = useState<string | null>(null);      // image being cropped
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<PixelArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initials = (email.split("@")[0].replace(/[^a-zA-Z]/g, "").slice(0, 2) || email.slice(0, 2)).toUpperCase();

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setErr("Use a JPG, PNG or WebP image."); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("That image is over 10 MB — pick a smaller one."); return; }
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => { setSrc(reader.result as string); setZoom(1); setCrop({ x: 0, y: 0 }); };
    reader.readAsDataURL(file);
  }

  const onCropComplete = useCallback((_: unknown, px: PixelArea) => setArea(px), []);

  function notifyNavbar() {
    window.dispatchEvent(new Event("airaml:avatar-changed"));
    router.refresh();
  }

  async function save() {
    if (!src || !area) return;
    setBusy(true); setErr(null);
    try {
      const blob = await cropToBlob(src, area);
      const fd = new FormData();
      fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error === "needs_setup" ? "Storage isn't set up yet — run supabase/avatars.sql." : (data.error || "Upload failed."));
      setUrl(data.avatar_url);
      setSrc(null);
      notifyNavbar();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't remove the photo.");
      setUrl(null);
      notifyNavbar();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't remove the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- user upload, not a build-time asset
        <img src={url} alt="Your profile picture" width={56} height={56}
          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
          background: "var(--brand-gradient)", color: "#fff", fontSize: 20, fontWeight: 700,
        }}>{initials}</span>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          style={{ padding: "0.5rem 1rem", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--text)", background: "transparent", border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)" }}>
          Change photo
        </button>
        {url && (
          <button onClick={remove} disabled={busy}
            style={{ padding: "0.5rem 1rem", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--text2)", background: "transparent", border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)" }}>
            Remove
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} style={{ display: "none" }} />

      {err && <p style={{ flexBasis: "100%", fontSize: 13, color: "#f87171", margin: 0 }}>{err}</p>}

      {src && (
        <div role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: "min(420px, 100%)", background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "var(--radius-card)", padding: 20 }}>
            <h3 style={{ fontFamily: "var(--type-display)", fontSize: 18, margin: "0 0 14px", color: "var(--text)" }}>Crop your photo</h3>
            <div style={{ position: "relative", width: "100%", height: 280, background: "var(--bg)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
              <Cropper
                image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
                onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", fontSize: 13, color: "var(--text2)" }}>
              Zoom
              <input type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setSrc(null)} disabled={busy}
                style={{ padding: "0.5rem 1rem", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--text2)", background: "transparent", border: "1px solid var(--border2)", borderRadius: "var(--radius-sm)" }}>
                Cancel
              </button>
              <button onClick={save} disabled={busy}
                style={{ padding: "0.5rem 1.1rem", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#fff", background: "var(--accent)", border: "none", borderRadius: "var(--radius-sm)" }}>
                {busy ? "Saving…" : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

#!/usr/bin/env python3
"""
Tool-card thumbnails: source, treat and rebuild.

Every card under /tools carries a photograph. This script is how they are made,
and it exists so the next one does not require reverse-engineering what was done
by hand the first time.

Two commands:

  rebuild            Re-treat all fifty from thumbnails.manifest.json.
                     Needs no API key — the manifest stores each photo's direct
                     URL, and image downloads are not an API call. Use this after
                     changing the treatment, which is the common case.

  add <tool-id> "<search query>" [must-word,must-word,...]
                     Source a photo for a NEW tool. Needs PEXELS_API_KEY, read
                     from the environment or from .env.local. Appends to the
                     manifest so `rebuild` can reproduce it later without a key.

The treatment is deliberately light. An earlier version tinted every photo 42%
toward its area's colour, which flooded all twenty-one Security cards the same
crimson and made fifty different photographs read as one image cropped fifty
times. The point of a per-tool photo is that it differs from its neighbours, so
the colour is now a hint: partial desaturation, a darkening toward the page
ground, and roughly a tenth of the area hue.
"""
import json, os, pathlib, statistics, subprocess, sys, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "scripts" / "thumbnails.manifest.json"
OUT = ROOT / "public" / "thumbs"
CACHE = pathlib.Path(os.environ.get("THUMB_CACHE", "/tmp/thumb-cache"))

W, H = 480, 192
BG = (10, 15, 30)
ACCENT = {
    "ML Pipeline": "#34d399", "Language & Documents": "#6366f1",
    "Computer Vision": "#38bdf8", "Security & Trust": "#f43f5e",
}
# Treatment. Tuned against a side-by-side of four Security thumbnails; see the
# module docstring for what the previous values did wrong.
DESAT, KEEP, TINT = 0.45, 0.55, 0.15
# Eight windows onto one photograph, for tools that fall back to their area's
# image. Same subject and tone, different frame, so a run of fallbacks does not
# look like a rendering fault.
WINDOWS = [(0.00, 0.00, 0.55), (0.45, 0.05, 0.52), (0.20, 0.30, 0.48), (0.58, 0.35, 0.40),
           (0.06, 0.45, 0.46), (0.34, 0.12, 0.44), (0.52, 0.52, 0.44), (0.14, 0.06, 0.40)]
MIN_SPREAD = 9.0   # calibrated against reviewed thumbnails, which measure 7.6-22.2


def api_key():
    key = os.environ.get("PEXELS_API_KEY")
    if key:
        return key
    envfile = ROOT / ".env.local"
    if envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.startswith("PEXELS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("PEXELS_API_KEY is not set. Put it in .env.local (which git ignores) "
             "as PEXELS_API_KEY=your-key, or export it. Only `add` needs it; "
             "`rebuild` does not.")


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def cover(im, box=None):
    from PIL import Image
    if box:
        fx, fy, fw = box
        iw, ih = im.size
        cw = int(iw * fw); ch = int(cw * H / W)
        x = min(int(iw * fx), iw - cw); y = min(int(ih * fy), ih - ch)
        return im.crop((x, y, x + cw, y + ch)).resize((W, H), Image.LANCZOS)
    iw, ih = im.size
    nh = int(iw / (W / H))
    if nh <= ih:
        crop = (0, (ih - nh) // 2, iw, (ih - nh) // 2 + nh)
    else:
        nw = int(ih * (W / H)); crop = ((iw - nw) // 2, 0, (iw - nw) // 2 + nw, ih)
    return im.crop(crop).resize((W, H), Image.LANCZOS)


def treat(im, domain):
    from PIL import Image
    accent = Image.new("RGB", im.size, hexrgb(ACCENT.get(domain, "#94a3b8")))
    dark = Image.new("RGB", im.size, BG)
    im = Image.blend(im, im.convert("L").convert("RGB"), DESAT)
    im = Image.blend(dark, im, KEEP)
    im = Image.blend(im, accent, TINT)
    mask = (Image.linear_gradient("L").rotate(180).resize(im.size)
            .point(lambda v: min(255, int(v * 1.5))))
    return Image.composite(im, dark, mask)


def spread(img):
    from PIL import Image
    g = img.convert("L").resize((238, 95), Image.LANCZOS)
    return statistics.pstdev(list(g.getdata()))


def download(pexels_id, url):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / f"{pexels_id}.jpg"
    if not f.exists() or f.stat().st_size < 5000:
        subprocess.run(["curl", "-sL", "-m", "40", "-o", str(f), url], check=False)
    return f if f.exists() and f.stat().st_size >= 5000 else None


def render(tool_id, entry):
    from PIL import Image
    f = download(entry["pexels"], entry["url"])
    if not f:
        return False, "download failed"
    src = Image.open(f).convert("RGB")
    box = WINDOWS[entry["window"] % len(WINDOWS)] if entry.get("mode") == "area-crop" else None
    img = treat(cover(src, box), entry["domain"])
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{tool_id}.webp", "WEBP", quality=82, method=6)
    return True, round(spread(img), 1)


def cmd_rebuild():
    manifest = json.loads(MANIFEST.read_text())
    ok = fail = 0
    for tool_id, entry in sorted(manifest.items()):
        good, info = render(tool_id, entry)
        if good:
            ok += 1
        else:
            fail += 1
            print(f"  FAILED {tool_id}: {info}")
    total = sum(p.stat().st_size for p in OUT.glob("*.webp"))
    print(f"rebuilt {ok} thumbnails ({fail} failed), {total/1024:.0f} KB total")


def cmd_add(tool_id, query, musts):
    import re
    from PIL import Image
    manifest = json.loads(MANIFEST.read_text())
    domain = tool_domain(tool_id)
    url = "https://api.pexels.com/v1/search?" + urllib.parse.urlencode(
        {"query": query, "per_page": 12, "orientation": "landscape", "size": "medium"})
    raw = subprocess.run(["curl", "-s", "-m", "25", "-H", f"Authorization: {api_key()}", url],
                         capture_output=True, text=True).stdout
    photos = json.loads(raw).get("photos", [])
    banned = re.compile(r"\btext\b|\bword\b|writing|typograph|caption", re.I)
    taken = {e["pexels"] for e in manifest.values()}
    best = None
    for p in photos:
        alt = p.get("alt") or ""
        if not alt or banned.search(alt) or p["id"] in taken:
            continue
        if musts and not any(m.lower() in alt.lower() for m in musts):
            continue
        f = download(p["id"], p["src"]["landscape"])
        if not f:
            continue
        img = treat(cover(Image.open(f).convert("RGB")), domain)
        s = spread(img)
        if best is None or s > best[0]:
            best = (s, p, alt)
    if not best or best[0] < MIN_SPREAD:
        print(f"No photo cleared the bar for {tool_id}; falling back to an area crop.")
        used = [e.get("window", 0) for e in manifest.values() if e.get("mode") == "area-crop"]
        area = next(e for e in manifest.values()
                    if e["domain"] == domain and e["mode"] == "area-crop")
        manifest[tool_id] = {"pexels": area["pexels"], "url": area["url"], "alt": "area crop",
                             "mode": "area-crop", "domain": domain,
                             "window": (max(used) + 1) if used else 0}
    else:
        s, p, alt = best
        manifest[tool_id] = {"pexels": p["id"], "url": p["src"]["landscape"], "alt": alt,
                             "mode": "photo", "domain": domain}
        print(f"{tool_id}: chose Pexels {p['id']} (contrast {s:.1f}) — {alt[:60]}")
    MANIFEST.write_text(json.dumps(manifest, indent=1, sort_keys=True) + "\n")
    render(tool_id, manifest[tool_id])
    print(f"wrote public/thumbs/{tool_id}.webp")


def tool_domain(tool_id):
    # The cards were split into src/data/capabilities/ by domain when the
    # single file outgrew the 400-line gate. Read the whole directory and
    # regex over the concatenation, which is what this always did.
    cap_dir = ROOT / "src" / "data" / "capabilities"
    src = "\n".join(p.read_text() for p in sorted(cap_dir.glob("*.ts")))
    import re
    for block in re.split(r'\n    id: "', src)[1:]:
        if block.split('"')[0] == tool_id:
            m = re.search(r'domain: "([^"]+)"', block)
            return m.group(1)
    sys.exit(f"{tool_id} is not in src/data/capabilities.ts — add it there first.")


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "rebuild":
        cmd_rebuild()
    elif len(sys.argv) >= 4 and sys.argv[1] == "add":
        cmd_add(sys.argv[2], sys.argv[3],
                sys.argv[4].split(",") if len(sys.argv) > 4 else [])
    else:
        sys.exit(__doc__)

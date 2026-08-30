#!/usr/bin/env python3
"""
Generates public/handbook.md — the user handbook for every tool and platform.

Generated, not hand-written, and that is the point: the descriptions, models,
inputs and tags all already live in src/data/capabilities.ts and registry.json,
which is what the cards on the site render from. A handbook typed out by hand
would start drifting from those the first time a tool changed, and a document
that quietly disagrees with the product is worse than no document.

Run after changing capabilities.ts, registry.json or domains.ts:

    python3 scripts/build-handbook.py

The page at /handbook reads this same file, so the page and the download can
never disagree either.
"""
import json, pathlib, re, sys
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "handbook.md"


def field(block, name):
    m = re.search(name + r': "((?:[^"\\]|\\.)*)"', block)
    return m.group(1).replace('\\"', '"') if m else ""


def tags(block):
    m = re.search(r"tags: \[(.*?)\]", block, re.S)
    return re.findall(r'"([^"]+)"', m.group(1)) if m else []


def read_capabilities():
    src = (ROOT / "src" / "data" / "capabilities.ts").read_text()
    out = []
    for block in re.split(r'\n    id: "', src)[1:]:
        out.append({
            "id": block.split('"')[0],
            "domain": field(block, "domain"), "title": field(block, "title"),
            "subtitle": field(block, "subtitle"), "description": field(block, "description"),
            "model": field(block, "model"), "input": field(block, "input"),
            "stat": field(block, "stat"), "statLabel": field(block, "statLabel"),
            "tags": tags(block),
            "internal": "internalLink" in block,
        })
    return out


def read_domains():
    src = (ROOT / "src" / "data" / "domains.ts").read_text()
    out = []
    for block in re.split(r'\n    slug: "', src)[1:]:
        out.append({"slug": block.split('"')[0], "name": field(block, "name"),
                    "blurb": field(block, "blurb")})
    return out


def where_it_runs(cap):
    t = set(cap["tags"])
    if {"Local Compute", "Client-Side", "Browser-Only"} & t:
        return "In your browser — nothing is uploaded"
    if "Live Engine" in t or "Live Network Check" in t:
        return "Server, with a live external check"
    return "Server"


def main():
    caps = read_capabilities()
    domains = read_domains()
    platforms = json.loads((ROOT / "src" / "data" / "registry.json").read_text())
    L = []
    add = L.append

    add("# AIRaML Handbook")
    add("")
    add(f"Every tool and platform on the site, what each one does, what it needs "
        f"from you, and where it runs. {len(caps)} tools across {len(domains)} areas, "
        f"plus {len(platforms)} full platforms.")
    add("")
    # A blockquote, not italics: italics are reserved for the one-line label
    # under each tool title, which is styled as a small-caps eyebrow — a whole
    # sentence in that style reads as shouting.
    add(f"> Generated from the site's own data on {date.today().isoformat()}. "
        f"If a description here differs from the one on a card, the card is "
        f"right and this file needs regenerating.")
    add("")
    add("## Contents")
    add("")
    for d in domains:
        n = len([c for c in caps if c["domain"] == d["name"]])
        add(f"- **{d['name']}** — {n} tools")
    add(f"- **Platforms** — {len(platforms)} full applications")
    add("")
    add("## How the site is organised")
    add("")
    add("The home page shows the four areas. Choosing one opens a page listing "
        "only that area's tools. Every tool card turns over to show what it does, "
        "and searching from the home page looks across all "
        f"{len(caps)} at once, so nothing is more than one step away.")
    add("")
    add("Each entry below lists the same fields the card shows: what the tool "
        "does, the model or algorithm behind it, what you feed it, and whether it "
        "runs in your browser or on the server.")
    add("")

    for d in domains:
        mine = [c for c in caps if c["domain"] == d["name"]]
        if not mine:
            continue
        add("---")
        add("")
        add(f"## {d['name']}")
        add("")
        if d["blurb"]:
            add(d["blurb"])
            add("")
        add(f"{len(mine)} tools. Browse them at `/tools/{d['slug']}`.")
        add("")
        for c in sorted(mine, key=lambda x: x["title"]):
            add(f"### {c['title']}")
            add("")
            add(f"*{c['subtitle']}*")
            add("")
            add(c["description"])
            add("")
            add("| | |")
            add("|---|---|")
            add(f"| **Model** | {c['model'] or '—'} |")
            add(f"| **Input** | {c['input'] or '—'} |")
            if c["stat"]:
                add(f"| **{c['statLabel'] or 'Figure'}** | {c['stat']} |")
            add(f"| **Runs** | {where_it_runs(c)} |")
            add(f"| **Tags** | {', '.join(c['tags']) if c['tags'] else '—'} |")
            add(f"| **Open** | `/tools/{c['id']}` |")
            add("")

    add("---")
    add("")
    add("## Platforms")
    add("")
    add("Complete multi-model applications, as opposed to the single-purpose "
        "tools above.")
    add("")
    for p in platforms:
        add(f"### {p['title']}")
        add("")
        add(f"*{p.get('task', '')}*")
        add("")
        add(p["description"])
        add("")
        add("| | |")
        add("|---|---|")
        add(f"| **Model** | {p.get('model') or '—'} |")
        add(f"| **Data** | {p.get('dataset') or '—'} |")
        if p.get("metric"):
            add(f"| **{p.get('metricLabel') or 'Figure'}** | {p['metric']} |")
        add(f"| **Tags** | {', '.join(p.get('tags', [])) or '—'} |")
        add("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(L)} lines, "
          f"{OUT.stat().st_size/1024:.0f} KB, {len(caps)} tools, {len(platforms)} platforms")


if __name__ == "__main__":
    sys.exit(main())

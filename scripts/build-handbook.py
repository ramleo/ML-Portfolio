#!/usr/bin/env python3
"""
Generates public/handbook.md — the AIRaML handbook, as a book.

Structure, not just a list: front matter, numbered parts and chapters, a
contents page that links into the text, then an appendix listing every tool.
The page at /handbook paginates this with Paged.js, so the contents entries
pick up real page numbers and the PDF reads as a printed book.

Nothing here is written by hand twice. Three sources feed it, all of which are
already the truth for something else on the site:

  src/data/capabilities.ts   the facts each card shows
  src/data/registry.json     the three platforms
  src/app/tools/*/userGuide.ts   the long-form guide a tool already ships

The last one matters most. Thirty-six tools ship a written guide that opens
from inside the tool itself, checked by whoever built the tool. Re-describing
those tools in prose here would mean writing a second account that drifts from
the first, and inventing detail for the ones I have not read. So a chapter
quotes the tool's own guide, and a tool without one gets a short entry that
says so rather than padding.

Run after changing any of those sources; CI fails if the committed file is
stale.
"""
import json, pathlib, re, sys

from handbook_sources import (
    read_capabilities, read_domains, read_guide, read_deep,
)

# When the first edition was set, stated once. It used to be date.today(),
# which is not a fact about the book — it is a fact about when the generator
# last ran, so the same sources produced a different handbook.md on the first
# of every month. CI regenerates and diffs, and it went red on 1 September
# 2026 with nobody having changed a thing. A new edition gets a new date here,
# deliberately.
EDITION = "August 2026"

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "handbook.md"


# Two of a chapter's seven sections are looked up rather than read straight
# through: what the tool cannot do, and how to talk about it. Wrapping each in
# an element lets the page give it a ground of its own, so a reader scrolling a
# long chapter on a phone can find it without reading every heading. The blank
# lines around the tags matter — without them the Markdown inside is not parsed.
TINTED_SECTIONS = {
    "Limits": "limits",
    "Likely interview questions": "qa",
}


def wrap_sections(md):
    """Wrap the two looked-up sections of a deep chapter in a div each.

    A section runs from its own H2 to the next H2 or the end of the chapter.
    Chapters are flat siblings in the finished book, so the wrapper has to be
    written here; CSS has no way to select "this heading and everything under
    it until the next one".
    """
    out, open_now = [], False
    for line in md.split("\n"):
        if line.startswith("## "):
            if open_now:
                out += ["", "</div>", ""]
                open_now = False
            key = TINTED_SECTIONS.get(line[3:].strip())
            if key:
                out += ["", f'<div class="bk-sec bk-sec-{key}">', ""]
                open_now = True
        out.append(line)
    if open_now:
        out += ["", "</div>", ""]
    return "\n".join(out)


def where_it_runs(cap):
    t = set(cap["tags"])
    if {"Local Compute", "Client-Side", "Browser-Only"} & t:
        return "In your browser — the file never leaves your machine"
    if {"Live Engine", "Live Network Check"} & t:
        return "On the server, with a live external check"
    return "On the server"


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    caps = read_capabilities()
    domains = read_domains()
    platforms = json.loads((ROOT / "src" / "data" / "registry.json").read_text())
    L, toc = [], []
    add, toc_add = L.append, toc.append

    # Chapters are numbered across the whole book, parts are numbered separately.
    chapter = 0
    def has_chapter(c):
        return bool(read_guide(c["id"]) or read_deep(c["id"]))

    detailed = [d for d in domains if any(has_chapter(c)
                                          for c in caps if c["domain"] == d["name"])]

    add('<div class="bk-titlepage">')
    add("")
    add("# The AIRaML Handbook")
    add("")
    add(f"### {len(caps)} tools for machine learning, documents, vision and security")
    add("")
    add(f"First edition · {EDITION}")
    add("")
    add("</div>")
    add("")
    add('<div class="bk-colophon">')
    add("")
    add("## About this edition")
    add("")
    add("This handbook is generated from the site itself — from the same data "
        "the cards render, and from the guide each tool ships inside its own "
        "interface. Nothing here is a second, hand-written account that can "
        "quietly drift from the software it describes; if a chapter and a tool "
        "disagree, the build fails.")
    add("")
    add("A chapter is given to any tool that ships a written guide inside "
        "its own interface, a deep chapter written for this book, or both. "
        "Where a tool has both, the guide comes first and explains how to "
        "use it; the chapter that follows explains how it works and why it "
        "was built that way. Tools with neither are listed in the appendix "
        "with their facts rather than padded out with prose nobody has "
        "checked.")
    add("")
    add("</div>")
    add("")

    body = []
    part = 0
    part_no: dict = {}          # area name -> its part number, for the appendix
    for d in detailed:
        mine = sorted([c for c in caps if c["domain"] == d["name"]], key=lambda x: x["title"])
        documented = [c for c in mine if has_chapter(c)]
        if not documented:
            continue
        part += 1
        part_no[d["name"]] = part
        pslug = f"part-{part}"
        toc_add(("part", f"Part {part} · {d['name']}", pslug))
        # One wrapper per part, carrying that area's colour as a custom
        # property. Chapters are flat siblings in Markdown, so a heading
        # cannot pass a colour down to the prose beneath it — the part has
        # to own it. Paged.js already breaks a multi-page wrapper correctly;
        # the appendix has been one since the first edition.
        body.append(f'<div class="bk-part bk-part-{part}">')
        body.append("")
        body.append(f'<div class="bk-partpage" id="{pslug}">')
        body.append("")
        body.append(f"# Part {part}")
        body.append("")
        body.append(f"## {d['name']}")
        body.append("")
        if d["blurb"]:
            body.append(d["blurb"])
            body.append("")
        body.append(f"{len(documented)} of this area's {len(mine)} tools have a "
                    f"chapter here. All of them are listed in the appendix.")
        body.append("")
        body.append("</div>")
        body.append("")
        for c in documented:
            chapter += 1
            cslug = f"ch-{chapter}-{slugify(c['title'])[:40]}"
            toc_add(("chapter", f"{chapter}. {c['title']}", cslug))
            body.append(f'<h1 class="bk-chapter" id="{cslug}">'
                        f'<span class="bk-chnum">Chapter {chapter}</span>{c["title"]}</h1>')
            body.append("")
            body.append(f"> {c['description']}")
            body.append("")
            body.append("## At a glance")
            body.append("")
            body.append('<div class="bk-facts">')
            body.append("")
            body.append("| | |")
            body.append("|---|---|")
            body.append(f"| **Also called** | {c['subtitle']} |")
            body.append(f"| **Model or method** | {c['model'] or '—'} |")
            body.append(f"| **What you give it** | {c['input'] or '—'} |")
            if c["stat"]:
                body.append(f"| **{c['statLabel'] or 'Figure'}** | {c['stat']} |")
            body.append(f"| **Where it runs** | {where_it_runs(c)} |")
            body.append(f"| **Find it at** | `{c['internalLink'] or '/tools/' + c['id']}` |")
            body.append("")
            body.append("</div>")
            body.append("")
            guide, deep = read_guide(c["id"]), read_deep(c["id"])
            if guide:
                if deep:
                    # With a deep chapter following, the guide needs a heading
                    # of its own — otherwise its sections read as if they
                    # belonged to the table above them.
                    body.append("## Using the tool")
                    body.append("")
                body.append(guide)
                body.append("")
            if deep:
                body.append(wrap_sections(deep))
                body.append("")
        body.append("</div>")
        body.append("")

    # ── Contents, written after the body so chapter numbers are settled ──
    add('<nav class="bk-toc" id="contents">')
    add("")
    add("# Contents")
    add("")
    part_of = 0
    for kind, label, anchor in toc:
        if kind == "part":
            part_of += 1
        add(f'- <a class="bk-toc-{kind} bk-part-{part_of}" '
            f'href="#{anchor}">{label}</a>')
    add(f'- <a class="bk-toc-part" href="#appendix">Appendix · Every tool</a>')
    add("")
    add("</nav>")
    add("")
    L.extend(body)

    # ── Appendix ──
    add('<div class="bk-appendix" id="appendix">')
    add("")
    add("# Appendix")
    add("")
    add("## Every tool")
    add("")
    add(f"All {len(caps)} tools, in area order, with the facts each card shows. "
        f"Tools with a chapter are marked.")
    add("")
    by_chapter = {t[1].split(". ", 1)[1]: t[1].split(".", 1)[0] for t in toc if t[0] == "chapter"}
    for d in domains:
        mine = sorted([c for c in caps if c["domain"] == d["name"]], key=lambda x: x["title"])
        if not mine:
            continue
        add(f'<div class="bk-part-{part_no.get(d["name"], 0)}">')
        add("")
        add(f"### {d['name']}")
        add("")
        add("| Tool | What it does | Runs |")
        add("|---|---|---|")
        for c in mine:
            ch = f" *(ch. {by_chapter[c['title']]})*" if c["title"] in by_chapter else ""
            add(f"| **{c['title']}**{ch} | {c['subtitle']} | {where_it_runs(c)} |")
        add("")
        add("</div>")
        add("")
    add("### Platforms")
    add("")
    add("| Platform | What it does |")
    add("|---|---|")
    for p in platforms:
        add(f"| **{p['title']}** | {p.get('task','')} — {p.get('dataset','')} |")
    add("")
    add("</div>")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L) + "\n")
    print(f"wrote {OUT.relative_to(ROOT)} — {len(L)} lines, {OUT.stat().st_size/1024:.0f} KB, "
          f"{part} parts, {chapter} chapters, {len(caps)} tools in the appendix")


if __name__ == "__main__":
    sys.exit(main())

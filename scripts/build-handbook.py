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
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "handbook.md"
TOOLS = ROOT / "src" / "app" / "tools"
CHAPTERS = ROOT / "docs" / "chapters"


def field(block, name):
    # \s* after the colon: the longer values in capabilities.ts are wrapped onto
    # the following line, and a pattern expecting `name: "` on one line silently
    # returns nothing for every one of them.
    m = re.search(name + r':\s*"((?:[^"\\]|\\.)*)"', block)
    return m.group(1).replace('\\"', '"') if m else ""


def read_capabilities():
    src = (ROOT / "src" / "data" / "capabilities.ts").read_text()
    out = []
    for block in re.split(r'\n    id: "', src)[1:]:
        tg = re.search(r"tags: \[(.*?)\]", block, re.S)
        out.append({
            "id": block.split('"')[0], "domain": field(block, "domain"),
            "title": field(block, "title"), "subtitle": field(block, "subtitle"),
            "description": field(block, "description"), "model": field(block, "model"),
            "input": field(block, "input"), "stat": field(block, "stat"),
            "statLabel": field(block, "statLabel"),
            "tags": re.findall(r'"([^"]+)"', tg.group(1)) if tg else [],
            # Two cards carry an id that is not their route — featureeng lives
            # at /tools/feature-engineering — so the printed address has to
            # come from the link the site itself uses, not from the id.
            "internalLink": field(block, "internalLink"),
        })
    return out


def read_domains():
    src = (ROOT / "src" / "data" / "domains.ts").read_text()
    return [{"slug": b.split('"')[0], "name": field(b, "name"), "blurb": field(b, "blurb")}
            for b in re.split(r'\n    slug: "', src)[1:]]


def read_guide(tool_id):
    """The tool's own in-app guide, unwrapped from its TypeScript template literal."""
    f = TOOLS / tool_id / "userGuide.ts"
    if not f.exists():
        return None
    src = f.read_text()
    # Guides close in two ways — `; and `.trim(); — and every one is followed by
    # a SUGGESTIONS export, so an end-of-file anchor matches nothing.
    m = re.search(r"_GUIDE\s*=\s*`(.*?)`(?:\.trim\(\))?\s*;", src, re.S)
    if not m:
        return None
    body = m.group(1)
    # Some guides are assembled from sibling modules by interpolation, and a
    # couple quote a measured figure held in a constant. Both are resolved
    # against the real source; an unresolved name is a hard failure rather than
    # a silent blank, because a published figure that quietly vanished — or
    # worse, changed — is the one thing this document must never do.
    def sibling_text(name):
        for sib in sorted(f.parent.rglob("*.ts")):
            m2 = re.search(re.escape(name) + r"\s*=\s*`(.*?)`(?:\.trim\(\))?\s*;",
                           sib.read_text(), re.S)
            if m2:
                return m2.group(1)
        return None

    def constant(name):
        """A numeric constant, following one hop into a JSON model file."""
        for sib in sorted(f.parent.rglob("*.ts")):
            txt = sib.read_text()
            m2 = re.search(r"\b" + re.escape(name) + r"\s*=\s*([0-9.]+)\s*;", txt)
            if m2:
                return float(m2.group(1))
            m3 = re.search(r"\b" + re.escape(name) + r"\s*=\s*(\w+)\.(\w+)\s*;", txt)
            if m3:
                mod, key = m3.group(1), m3.group(2)
                m4 = re.search(r"import\s+" + re.escape(mod) + r"\s+from\s+\"([^\"]+)\"", txt)
                if m4:
                    jf = (sib.parent / m4.group(1)).resolve()
                    if jf.exists():
                        val = json.loads(jf.read_text()).get(key)
                        if isinstance(val, (int, float)):
                            return val
        return None

    missing = []

    def resolve(mm):
        expr = mm.group(1).strip()
        if re.fullmatch(r"\w+", expr):
            block = sibling_text(expr)
            if block is not None:
                return block
        env = {}
        for n in set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*", expr)):
            if n in ("Math", "round"):
                continue
            v = constant(n)
            if v is None:
                missing.append((tool_id, expr, n))
                return mm.group(0)
            env[n] = v
        try:
            return str(eval(expr.replace("Math.round", "round"), {"round": round}, env))
        except Exception:
            missing.append((tool_id, expr, "evaluation"))
            return mm.group(0)

    for _ in range(4):                      # nested interpolation, bounded
        new_body = re.sub(r"\$\{([^{}]+)\}", resolve, body)
        if new_body == body:
            break
        body = new_body
    if missing:
        for t, e, n in missing:
            print(f"  unresolved in {t}: ${{{e}}} (missing {n})", file=sys.stderr)
        sys.exit(f"Refusing to write a handbook with {len(missing)} unresolved value(s).")

    # The guide repeats the tool's name as its own H1; the chapter heading has
    # that job here, so drop it and lift everything one level.
    body = re.sub(r"^\s*#\s+.*?\n", "", body, count=1)
    body = re.sub(r"^(#{2,5})\s", lambda mm: "#" * (len(mm.group(1)) + 1) + " ", body, flags=re.M)
    return body.strip()


def read_deep(tool_id):
    """The hand-written deep chapter for a tool, if one exists.

    Kept apart from everything else in this script on purpose. The generated
    material cannot drift from the app because it is read out of the app;
    written explanation can. Holding it in its own file, keyed by the tool's
    id in capabilities.ts, keeps the boundary visible: the facts above a
    chapter's prose are still guarded by the CI job, and only the prose is
    the author's word.

    Its headings start at level 2, so they sit alongside "At a glance"
    rather than under it, and are used as written.
    """
    f = CHAPTERS / f"{tool_id}.md"
    if not f.exists():
        return None
    body = f.read_text().strip()
    body = re.sub(r"^\s*#\s+.*?\n", "", body, count=1)   # a stray H1, if any
    return body.strip() or None


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
    add(f"First edition · {date.today().strftime('%B %Y')}")
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
    for d in detailed:
        mine = sorted([c for c in caps if c["domain"] == d["name"]], key=lambda x: x["title"])
        documented = [c for c in mine if has_chapter(c)]
        if not documented:
            continue
        part += 1
        pslug = f"part-{part}"
        toc_add(("part", f"Part {part} · {d['name']}", pslug))
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
                body.append(deep)
                body.append("")

    # ── Contents, written after the body so chapter numbers are settled ──
    add('<nav class="bk-toc" id="contents">')
    add("")
    add("# Contents")
    add("")
    for kind, label, anchor in toc:
        add(f'- <a class="bk-toc-{kind}" href="#{anchor}">{label}</a>')
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
        add(f"### {d['name']}")
        add("")
        add("| Tool | What it does | Runs |")
        add("|---|---|---|")
        for c in mine:
            ch = f" *(ch. {by_chapter[c['title']]})*" if c["title"] in by_chapter else ""
            add(f"| **{c['title']}**{ch} | {c['subtitle']} | {where_it_runs(c)} |")
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

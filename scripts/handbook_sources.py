#!/usr/bin/env python3
"""
Reading the handbook's three sources.

Split out of build-handbook.py, which had grown past the project's file-length
limit. The division is a real one rather than an arbitrary cut: everything here
*reads* — capabilities.ts, the domain list, a tool's shipped user guide, a
hand-written deep chapter — and none of it knows anything about the shape of
the book. build-handbook.py does the assembling and owns every decision about
parts, chapters, contents and appendix.
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
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

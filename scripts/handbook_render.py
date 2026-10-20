"""Pure rendering helpers for build-handbook.py.

Split out so build-handbook.py stays under the repo's 400-line file cap. These
are the stateless pieces — no I/O, no source reading — that shape already-read
content into the book's markup.
"""
import re


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

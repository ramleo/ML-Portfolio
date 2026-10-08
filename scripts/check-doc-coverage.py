#!/usr/bin/env python3
"""Doc-coverage gate: fail CI when a shipped feature has no documentation footprint.

The handbook job proves the generated book is *in sync* with its sources. It
cannot prove the sources *exist* — a new tool whose card nobody wrote, or a tool
whose guide was authored but never wired into its page (so it reaches the
handbook and nowhere a user actually is), both regenerate a perfectly consistent
handbook that is silently missing the feature. This checks the three relations
that have a footprint CI can enumerate:

  A. tool dir  -> a capabilities card routing to it
  B. tool guide -> wired into the tool's own page (not handbook-only)
  C. platform  -> an in-app guide or a hand-written chapter

INHERENT LIMIT (stated so nobody mistakes a green check for full coverage): a
pure *behavior* change inside an existing file adds no new dir, route, card or
guide, so it has nothing to enumerate and cannot be caught here. That always
needs human review. This gate catches the structural omission, not the silent
behavior drift.

Reuses handbook_sources.py for card/platform parsing so this and the handbook
read their sources exactly one way.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import handbook_sources as hs  # noqa: E402

ROOT = hs.ROOT
TOOLS = hs.TOOLS

# Tool dirs that deliberately ship no capabilities card. Each is documented
# elsewhere, so a card would be redundant — but a NEW card-less tool is almost
# always a mistake (blank card, no handbook coverage), which is what invariant A
# exists to catch. Add here only with the reason, the way the file-length
# baseline is kept.
CARD_EXEMPT = {
    "rag-analytics",   # a usage dashboard, not a card tool; covered by its own userGuide.ts
    "text-to-sql",     # the /sql platform's tool route; covered as a platform (registry.json)
}

# A tsx in a tool dir counts the guide as "wired" if it names any of these.
GUIDE_MARKERS = ("ToolGuideModal", "UserGuideModal", "_GUIDE")


def tool_dirs():
    """Every real tool: a dir under src/app/tools with a page.tsx, not dynamic."""
    return sorted(
        d for d in TOOLS.iterdir()
        if d.is_dir() and not d.name.startswith("[") and (d / "page.tsx").exists()
    )


def card_routes():
    """The set of tool-dir names that a capabilities card routes to."""
    routes = set()
    for c in hs.read_capabilities():
        link = c.get("internalLink") or f"/tools/{c['id']}"
        if link.startswith("/tools/"):
            routes.add(link[len("/tools/"):].strip("/"))
    return routes


def check_tools_have_cards():
    routes = card_routes()
    return [
        f"tool /tools/{d.name} has no capabilities card "
        f"(add one in src/data/capabilities/, or add {d.name!r} to CARD_EXEMPT with a reason)"
        for d in tool_dirs()
        if d.name not in routes and d.name not in CARD_EXEMPT
    ]


def check_guides_are_wired():
    fails = []
    for d in tool_dirs():
        if not (d / "userGuide.ts").exists():
            continue  # a card-only tool is legitimate; we don't force a guide
        if not any(
            any(m in tsx.read_text() for m in GUIDE_MARKERS)
            for tsx in d.rglob("*.tsx")
        ):
            fails.append(
                f"tool /tools/{d.name} ships userGuide.ts but no page wires it "
                f"(expected one of {', '.join(GUIDE_MARKERS)} in a .tsx) — "
                f"the guide reaches the handbook but not the tool page"
            )
    return fails


def check_platforms_are_documented():
    return [
        f"platform {p['id']} ({p.get('href') or p.get('url')}) has no in-app guide "
        f"(guide.ts/worldGuide.ts under its route) and no docs/chapters/{p['id']}.md"
        for p in hs.read_platforms()
        if p.get("guide") is None and p.get("deep") is None
    ]


def main():
    checks = (
        ("tool -> capabilities card", check_tools_have_cards),
        ("tool guide -> wired in-app", check_guides_are_wired),
        ("platform -> guide/chapter", check_platforms_are_documented),
    )
    failures = []
    for name, fn in checks:
        fails = fn()
        status = "FAIL" if fails else "ok"
        print(f"[{status}] {name}")
        failures.extend(fails)

    if failures:
        print("\nDoc-coverage gaps:", file=sys.stderr)
        for f in failures:
            print(f"  - {f}", file=sys.stderr)
        sys.exit(1)
    print("\nAll documented features have their expected footprint.")


if __name__ == "__main__":
    main()

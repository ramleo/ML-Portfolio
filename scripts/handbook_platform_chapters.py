"""The hand-authored platform chapters for the handbook.

Most of the book is generated from the sources in handbook_sources.py — the tool
cards, the deep chapters, the platforms. A few chapters describe platform-level
features that no single tool owns (programmatic access; the chatbot builder), so
they are written out by hand here rather than drawn from capabilities.ts.

They live in their own module to keep build-handbook.py under the line limit, and
because they are the one place in the build where prose is authored directly. Each
function appends to the book's `body` and `toc` lists and returns the advanced
`(part, chapter)` counters, so the caller threads them in order.
"""


def developer_access_part(body, toc, part, chapter, part_no):
    """Part · Developer access — the REST API and the MCP endpoint.

    Hand-authored rather than drawn from capabilities.ts: programmatic access is a
    feature for developers, not a tool card, but it belongs in the handbook all the
    same. It describes the platform's own endpoints, which no single tool owns.
    """
    part += 1
    part_no["Developer access"] = part
    pslug = f"part-{part}"
    toc.append(("part", f"Part {part} · Developer access", pslug))
    body.append(f'<div class="bk-part bk-part-{part}">')
    body.append("")
    body.append(f'<div class="bk-partpage" id="{pslug}">')
    body.append("")
    body.append(f"# Part {part}")
    body.append("")
    body.append("## Developer access")
    body.append("")
    body.append("Beyond the interactive tools, a curated subset can be called "
                "programmatically — over a REST API and over the Model Context Protocol "
                "(MCP) for AI clients. Both use the same API key.")
    body.append("")
    body.append("</div>")
    body.append("")

    chapter += 1
    cslug = f"ch-{chapter}-public-api-and-mcp"
    toc.append(("chapter", f"{chapter}. Public API & MCP", cslug))
    body.append(f'<h1 class="bk-chapter" id="{cslug}">'
                f'<span class="bk-chnum">Chapter {chapter}</span>Public API &amp; MCP</h1>')
    body.append("")
    body.append("> Call a stable subset of the tools from your own code, or from an AI "
                "client, authenticated with an API key.")
    body.append("")
    body.append("## At a glance")
    body.append("")
    body.append('<div class="bk-facts">')
    body.append("")
    body.append("| | |")
    body.append("|---|---|")
    body.append("| **Auth** | an API key — `X-API-Key` header (REST) or Bearer token (MCP) |")
    body.append("| **REST base** | `https://wram1708-ml-unified.hf.space/v1` |")
    body.append("| **MCP endpoint** | `https://wram1708-ml-unified.hf.space/mcp/` |")
    body.append("| **Spec** | `https://wram1708-ml-unified.hf.space/v1/openapi.json` |")
    body.append("| **Limits** | per-key monthly request quota + spend budget |")
    body.append("")
    body.append("</div>")
    body.append("")
    body.append("## Getting a key")
    body.append("")
    body.append("Keys are issued on request — contact the site owner. Each key carries a "
                "tier, a monthly request quota, and a spend budget, and can be revoked at "
                "any time. Only a hash of the key is ever stored.")
    body.append("")
    body.append("## The REST API")
    body.append("")
    body.append("Three endpoints are available today, all `POST` with JSON in and out:")
    body.append("")
    body.append("- `POST /v1/tls-headers/check` — TLS & security-header scan. Body: `{ \"host\": \"example.com\" }`")
    body.append("- `POST /v1/email-auth/check` — SPF/DKIM/DMARC analysis. Body: `{ \"headers\": \"<raw email headers>\" }`")
    body.append("- `POST /v1/anomaly-detection/score` — anomaly scores. Body: `{ \"baseline\": [...], \"events\": [...] }`")
    body.append("")
    body.append("```bash")
    body.append("curl -X POST https://wram1708-ml-unified.hf.space/v1/tls-headers/check \\")
    body.append('  -H "X-API-Key: ak_live_…" \\')
    body.append('  -H "Content-Type: application/json" \\')
    body.append("  -d '{\"host\":\"example.com\"}'")
    body.append("```")
    body.append("")
    body.append("A missing or invalid key returns `401`; over the quota or rate limit "
                "returns `429`. Import `/v1/openapi.json` into Postman or a client "
                "generator for the full schema.")
    body.append("")
    body.append("## MCP (for AI clients)")
    body.append("")
    body.append("The tools are exposed over the Model Context Protocol (Streamable "
                "HTTP), so clients such as Claude Desktop and Cursor can use them. Point "
                "the client at the MCP endpoint and pass your key as a Bearer token:")
    body.append("")
    body.append("```json")
    body.append("{")
    body.append('  "mcpServers": {')
    body.append('    "airaml": {')
    body.append('      "url": "https://wram1708-ml-unified.hf.space/mcp/",')
    body.append('      "headers": { "Authorization": "Bearer ak_live_…" }')
    body.append("    }")
    body.append("  }")
    body.append("}")
    body.append("```")
    body.append("")
    body.append("MCP exposes a little more than the REST API:")
    body.append("")
    body.append("- **Tools** — the three REST endpoints above, plus **attack-surface "
                "check** (passive recon of a host), **prompt-injection check** (screen "
                "untrusted text before acting on it), and **YARA malware scan** (signature "
                "scan of file content).")
    body.append("- **Resources** — read-only context a client can pull: `airaml://tools` "
                "(the tool catalog) and `airaml://handbook` (this handbook, section by "
                "section).")
    body.append("- **Prompts** — ready-made workflows: *scan-host*, *check-email-headers* "
                "and *check-untrusted-text*.")
    body.append("")
    return part, chapter


def chatbot_builder_part(body, toc, part, chapter, part_no):
    """Part · Chatbot builder — build a grounded bot from your own documents.

    A user-facing platform feature with no tool card of its own, so it is written
    out here. Describes what signed-in users get (build + test), what a paid plan
    adds (publish + embed), and how an embedded widget is secured.
    """
    part += 1
    part_no["Chatbot builder"] = part
    pslug = f"part-{part}"
    toc.append(("part", f"Part {part} · Chatbot builder", pslug))
    body.append(f'<div class="bk-part bk-part-{part}">')
    body.append("")
    body.append(f'<div class="bk-partpage" id="{pslug}">')
    body.append("")
    body.append(f"# Part {part}")
    body.append("")
    body.append("## Chatbot builder")
    body.append("")
    body.append("Build an AI chatbot grounded in your own documents, with no code, then "
                "embed it on your own website. Answers are drawn only from the material "
                "you upload — the bot cites it, and declines when a question falls "
                "outside it.")
    body.append("")
    body.append("</div>")
    body.append("")

    chapter += 1
    cslug = f"ch-{chapter}-chatbot-builder"
    toc.append(("chapter", f"{chapter}. Chatbot builder", cslug))
    body.append(f'<h1 class="bk-chapter" id="{cslug}">'
                f'<span class="bk-chnum">Chapter {chapter}</span>Chatbot builder</h1>')
    body.append("")
    body.append("> Create a retrieval-grounded chatbot from your own knowledge base, test "
                "it in the browser, and — on a paid plan — publish it as an embeddable "
                "widget for any site.")
    body.append("")
    body.append("## At a glance")
    body.append("")
    body.append('<div class="bk-facts">')
    body.append("")
    body.append("| | |")
    body.append("|---|---|")
    body.append("| **Who it's for** | any signed-in user — no code required |")
    body.append("| **How it answers** | retrieval over your uploaded documents, grounded and cited |")
    body.append("| **Find it at** | profile menu → **Chatbots** (`/app/chatbots`) |")
    body.append("| **Free plan** | build & test, up to 2 bots |")
    body.append("| **Pro plan** | publish & embed, up to 10 bots |")
    body.append("| **Billing** | profile menu → **Billing** (`/app/billing`) |")
    body.append("")
    body.append("</div>")
    body.append("")
    body.append("## Building a bot")
    body.append("")
    body.append("From **Chatbots**, create a bot and give it a knowledge base — upload the "
                "documents it should answer from. Set its **persona** (the system prompt "
                "that fixes its voice and scope), then open the **Test** tab and talk to "
                "it in the browser. The test chat is grounded in exactly what you "
                "uploaded: if the answer is not in your documents, the bot says so rather "
                "than inventing one. The test conversation persists while you switch "
                "tabs, and a **Clear chat** button resets it.")
    body.append("")
    body.append("## Plans")
    body.append("")
    body.append("Building and testing are free. **Publishing** — making a bot reachable "
                "from outside the builder — requires the **Pro** plan, which is the cost "
                "guard: a free account can design and try a bot end to end, but cannot put "
                "it live.")
    body.append("")
    body.append("| | Free | Pro |")
    body.append("|---|---|---|")
    body.append("| Build & test | ✓ | ✓ |")
    body.append("| Bots | up to 2 | up to 10 |")
    body.append("| Publish & embed | — | ✓ |")
    body.append("")
    body.append("Upgrade from the **Billing** page, which uses Stripe's hosted checkout "
                "and billing portal — no card details ever touch this site.")
    body.append("")
    body.append("## Publishing & embedding")
    body.append("")
    body.append("On a Pro plan, the bot's **Embed** tab publishes it and gives you a "
                "one-line snippet to drop into any page:")
    body.append("")
    body.append("```html")
    body.append('<script src="https://ml-portfolio-rho.vercel.app/embed/v1.js"')
    body.append('        data-bot="pk_live_…" async></script>')
    body.append("```")
    body.append("")
    body.append("The script adds a floating chat bubble that opens the bot in a sandboxed "
                "iframe. The `pk_live_…` key is **public** — it only starts a chat — and "
                "regenerating it invalidates the old one.")
    body.append("")
    body.append("## How an embedded bot is kept safe")
    body.append("")
    body.append("A public key on a public page could be copied, so the widget does not "
                "rely on it being secret. Several controls bound what it can do:")
    body.append("")
    body.append("- **Origin allowlist** — a chat only starts from the sites you list.")
    body.append("- **Short-lived session token** — the page mints a token bound to your "
                "bot and the calling site; it expires in minutes.")
    body.append("- **Rate limit** — per-visitor message throttling.")
    body.append("- **Daily message cap** — a hard ceiling on messages per day, so a "
                "runaway or abusive page cannot run up unbounded cost.")
    body.append("- **Kill switch** — unpublish the bot and every embed stops at once.")
    body.append("")
    body.append("The origin check steers ordinary use to the right sites; the rate limit, "
                "daily cap, and kill switch are the hard backstops.")
    body.append("")
    return part, chapter

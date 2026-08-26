export type RiskLevel = "low" | "medium" | "high";

export type PermissionFinding = { name: string; risk: RiskLevel; why: string };
export type ComboFinding = { name: string; risk: RiskLevel; why: string };

export type ManifestAnalysis = {
  permissions: PermissionFinding[];
  broadHostAccess: boolean;
  broadHostPatterns: string[];
  combosTriggered: ComboFinding[];
  overallRisk: RiskLevel;
  warnings: string[];
};

/** Documented risk taxonomy for Chrome/Edge extension permissions — reflects
 * real, published extension-security guidance (Chrome's own permission
 * warnings + independent research like Duo Labs' extension studies), not an
 * invented scale. Only covers commonly-seen permissions; anything absent is
 * treated as unclassified/low rather than silently flagged. */
export const PERMISSION_RISK: Record<string, { risk: RiskLevel; why: string }> = {
  debugger: { risk: "high", why: "Full Chrome DevTools Protocol access to any attached tab — can read/modify anything on the page, intercept all traffic, and execute arbitrary code in page context." },
  nativeMessaging: { risk: "high", why: "Can exchange messages with a native application installed on the machine, escaping the browser sandbox entirely." },
  webRequestBlocking: { risk: "high", why: "Can synchronously intercept, block, or rewrite every network request the browser makes." },
  webRequest: { risk: "medium", why: "Can observe (read-only, unless paired with webRequestBlocking) every network request the browser makes." },
  proxy: { risk: "high", why: "Can redirect all of the browser's network traffic through an arbitrary proxy server." },
  cookies: { risk: "high", why: "Can read and write cookies for any site it has host permission for — including session/auth cookies." },
  history: { risk: "high", why: "Can read the user's entire browsing history." },
  tabs: { risk: "medium", why: "Can read the URL, title, and favicon of every open tab (without <all_urls>, cannot read page content)." },
  management: { risk: "medium", why: "Can enumerate, enable, disable, or uninstall other installed extensions." },
  downloads: { risk: "medium", why: "Can initiate, monitor, and read the contents of files the browser downloads." },
  clipboardRead: { risk: "medium", why: "Can read the current contents of the system clipboard, which often holds passwords or sensitive text just copied by the user." },
  clipboardWrite: { risk: "low", why: "Can write to the clipboard — lower risk than reading, but can be used for clipboard-hijacking scams." },
  geolocation: { risk: "medium", why: "Can access the user's physical location." },
  identity: { risk: "medium", why: "Can access OAuth tokens / the user's signed-in browser identity." },
  scripting: { risk: "medium", why: "Can inject and execute arbitrary JavaScript into pages it has host permission for (Manifest V3's programmatic-injection API)." },
  declarativeNetRequest: { risk: "low", why: "Can block/redirect network requests via a declared static ruleset — more constrained than webRequestBlocking since rules can't be written dynamically at runtime from arbitrary page data." },
  storage: { risk: "low", why: "Local extension storage, isolated from other extensions and pages." },
  alarms: { risk: "low", why: "Scheduled callbacks — no data access implied." },
  contextMenus: { risk: "low", why: "Adds right-click menu entries — no data access implied." },
  notifications: { risk: "low", why: "Can show desktop notifications — no data access implied." },
  background: { risk: "low", why: "Runs a persistent background script/service worker — no data access implied by itself." },
  activeTab: { risk: "low", why: "Temporary access to only the current tab, only after a direct user action (click) — one of the safer host-access mechanisms by design." },
};

const BROAD_HOST_PATTERNS = ["<all_urls>", "*://*/*", "http://*/*", "https://*/*"];

function isBroadHostPattern(pattern: string): boolean {
  if (BROAD_HOST_PATTERNS.includes(pattern)) return true;
  // A wildcard second-level domain, e.g. "*://*.com/*" or "http://*.co.uk/*"
  return /^\*?:\/\/\*\.[a-z]{2,}(\.[a-z]{2,})?\/\*$/i.test(pattern);
}

export function detectBroadHostAccess(manifest: Record<string, unknown>): { broad: boolean; patterns: string[] } {
  const candidates: string[] = [];
  const hostPerms = manifest.host_permissions;
  if (Array.isArray(hostPerms)) candidates.push(...hostPerms.filter((p): p is string => typeof p === "string"));
  const perms = manifest.permissions;
  if (Array.isArray(perms)) candidates.push(...perms.filter((p): p is string => typeof p === "string" && (p === "<all_urls>" || p.includes("://"))));
  const contentScripts = manifest.content_scripts;
  if (Array.isArray(contentScripts)) {
    for (const cs of contentScripts) {
      const matches = (cs as { matches?: unknown })?.matches;
      if (Array.isArray(matches)) candidates.push(...matches.filter((m): m is string => typeof m === "string"));
    }
  }
  const broadMatches = [...new Set(candidates.filter(isBroadHostPattern))];
  return { broad: broadMatches.length > 0, patterns: broadMatches };
}

function hasPermission(manifest: Record<string, unknown>, name: string): boolean {
  const perms = manifest.permissions;
  return Array.isArray(perms) && perms.includes(name);
}

function hasContentScriptInjection(manifest: Record<string, unknown>): boolean {
  return Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0
    || hasPermission(manifest, "scripting");
}

type ComboRule = { name: string; test: (m: Record<string, unknown>, broadHost: boolean) => boolean; risk: RiskLevel; why: string };

/** A fixed list of documented dangerous permission *combinations* — the point
 * being that broad host access alone, or a sensitive permission alone, is
 * often legitimate (a password manager needs <all_urls> + cookies), but the
 * combination unlocks a specific real capability worth flagging. */
export const COMBO_RULES: ComboRule[] = [
  {
    name: "Broad host access + network interception + cookie access",
    test: (m, broad) => broad && (hasPermission(m, "webRequestBlocking") || hasPermission(m, "webRequest")) && hasPermission(m, "cookies"),
    risk: "high",
    why: "Can intercept network traffic AND read/write cookies across every site — enough to hijack sessions on any site the user visits.",
  },
  {
    name: "Broad host access + arbitrary script injection",
    test: (m, broad) => broad && hasContentScriptInjection(m),
    risk: "high",
    why: "Can run arbitrary JavaScript in the context of any page the user visits — effectively full control over every site's content.",
  },
  {
    name: "Native messaging + downloads",
    test: (m) => hasPermission(m, "nativeMessaging") && hasPermission(m, "downloads"),
    risk: "high",
    why: "Can pass data to a native application on the machine and separately read/write downloaded files — a plausible exfiltration or local-file-tampering path.",
  },
  {
    name: "Broad host access + clipboard read",
    test: (m, broad) => broad && hasPermission(m, "clipboardRead"),
    risk: "medium",
    why: "Can read clipboard contents while also having access to every site — clipboard often holds passwords or 2FA codes just copied by the user.",
  },
  {
    name: "Debugger permission",
    test: (m) => hasPermission(m, "debugger"),
    risk: "high",
    why: "The debugger permission alone is already effectively full remote-control access to any attached tab — no combination needed to be critical.",
  },
];

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

export function parseManifest(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That doesn't look like valid JSON — paste the full contents of a manifest.json file.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object (a manifest.json has top-level keys like \"permissions\", \"manifest_version\", etc.).");
  }
  return parsed as Record<string, unknown>;
}

export function analyzeManifest(raw: string): ManifestAnalysis {
  const manifest = parseManifest(raw);

  const declaredPermissions = new Set<string>();
  for (const key of ["permissions", "optional_permissions"] as const) {
    const list = manifest[key];
    if (Array.isArray(list)) {
      for (const p of list) {
        if (typeof p === "string" && !p.includes("://") && p !== "<all_urls>") declaredPermissions.add(p);
      }
    }
  }

  const permissions: PermissionFinding[] = [...declaredPermissions].map(name => {
    const known = PERMISSION_RISK[name];
    return known ? { name, risk: known.risk, why: known.why } : { name, risk: "low" as RiskLevel, why: "Not in the documented high-risk permission set." };
  });

  const { broad, patterns } = detectBroadHostAccess(manifest);
  const combosTriggered = COMBO_RULES.filter(rule => rule.test(manifest, broad)).map(({ name, risk, why }) => ({ name, risk, why }));

  const warnings: string[] = [];
  if (declaredPermissions.size === 0 && !broad) {
    warnings.push("No permissions or host access declared — either a very minimal extension, or the pasted manifest is incomplete.");
  }
  if (broad) {
    warnings.push(`Requests broad host access (${patterns.join(", ")}) — can act on every website the user visits, not just a specific one.`);
  }

  const allRisks: RiskLevel[] = [
    ...permissions.map(p => p.risk),
    ...combosTriggered.map(c => c.risk),
  ];
  const overallRisk: RiskLevel = allRisks.length === 0
    ? "low"
    : allRisks.reduce((worst, r) => (RISK_RANK[r] > RISK_RANK[worst] ? r : worst), "low" as RiskLevel);

  return {
    permissions: permissions.sort((a, b) => RISK_RANK[b.risk] - RISK_RANK[a.risk]),
    broadHostAccess: broad,
    broadHostPatterns: patterns,
    combosTriggered,
    overallRisk,
    warnings,
  };
}

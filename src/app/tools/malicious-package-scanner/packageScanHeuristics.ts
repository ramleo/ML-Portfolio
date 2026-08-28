// Real, published static-analysis heuristics for malicious-package
// detection (Datadog's GuardDog is the best-known open-source example) —
// pattern-matching common attacker techniques rather than comparing
// against known-malware signatures, which is why this style of check can
// catch never-before-seen malicious packages. Pure heuristics, no ML, no
// network — everything runs on pasted text right here in the browser.

// Small, curated list of well-known real npm/PyPI package names — same
// "not exhaustive, disclosed" precedent as the QR Phishing Detector's
// brand-typosquat list. A typosquat of a name NOT on this list won't be
// flagged by this specific check.
export const KNOWN_PACKAGES = [
  // npm
  "react", "react-dom", "vue", "angular", "lodash", "express", "axios", "chalk",
  "commander", "request", "moment", "webpack", "babel-core", "eslint", "jest",
  "typescript", "next", "redux", "jquery", "bootstrap", "socket.io", "mongoose",
  "sequelize", "prisma", "graphql", "apollo-client", "styled-components", "tailwindcss",
  "vite", "rollup", "esbuild", "prettier", "nodemon", "dotenv", "cors", "body-parser",
  "passport", "jsonwebtoken", "bcrypt", "uuid", "yargs", "inquirer", "chokidar",
  "glob", "minimist", "semver", "debug", "colors", "async", "underscore", "ramda",
  "rxjs", "zod", "yup", "joi", "ajv", "cheerio", "puppeteer", "playwright",
  "electron", "three", "d3", "chart.js", "leaflet", "moment-timezone", "dayjs",
  "date-fns", "uglify-js", "terser", "postcss", "sass", "less", "stylus",
  "ws", "node-fetch", "form-data", "multer", "sharp", "jimp", "csv-parser",
  "xml2js", "cheerio", "fs-extra", "rimraf", "mkdirp", "concurrently", "cross-env",
  "husky", "lint-staged", "commitizen", "standard-version", "release-it",
  // PyPI
  "requests", "numpy", "pandas", "flask", "django", "boto3", "pytest", "click",
  "pyyaml", "urllib3", "setuptools", "wheel", "pip", "certifi", "idna",
  "charset-normalizer", "six", "python-dateutil", "sqlalchemy", "jinja2",
  "markupsafe", "werkzeug", "cryptography", "pillow", "scipy", "matplotlib",
  "scikit-learn", "tensorflow", "torch", "transformers", "fastapi", "uvicorn",
  "pydantic", "starlette", "httpx", "aiohttp", "beautifulsoup4", "lxml",
  "selenium", "scrapy", "celery", "redis", "psycopg2", "pymongo", "gunicorn",
  "gevent", "twisted", "paramiko", "fabric", "invoke", "click", "rich",
  "tqdm", "colorama", "attrs", "packaging", "wrapt", "protobuf", "grpcio",
  "openai", "anthropic", "langchain", "huggingface-hub", "tokenizers", "nltk",
];

export function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

export function shannonEntropy(text: string): number {
  if (!text) return 0;
  const counts = new Map<string, number>();
  for (const ch of text) counts.set(ch, (counts.get(ch) || 0) + 1);
  const len = text.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export type TyposquatFlag = { name: string; closestMatch: string; distance: number };
export type ScriptFlag = { hook: string; script: string };

export type ManifestScanResult = {
  packageManager: "npm" | "pip" | "unknown";
  dependencyCount: number;
  suspiciousScripts: ScriptFlag[];
  possibleTyposquats: TyposquatFlag[];
};

const LIFECYCLE_HOOKS = ["preinstall", "install", "postinstall"];

function findTyposquats(names: string[]): TyposquatFlag[] {
  const flags: TyposquatFlag[] = [];
  const knownSet = new Set(KNOWN_PACKAGES);
  for (const name of names) {
    const lower = name.toLowerCase();
    if (knownSet.has(lower)) continue;
    for (const known of KNOWN_PACKAGES) {
      if (Math.abs(lower.length - known.length) > 2) continue;
      const distance = levenshteinDistance(lower, known);
      if (distance >= 1 && distance <= 2) {
        flags.push({ name, closestMatch: known, distance });
        break;
      }
    }
  }
  return flags;
}

/** Parses a package.json (npm) — real JSON, checked for lifecycle-script
 * hooks and dependency-name typosquats. */
function scanPackageJson(text: string): ManifestScanResult {
  const parsed = JSON.parse(text);
  const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
  const names = Object.keys(deps);
  const scripts = parsed.scripts || {};
  const suspiciousScripts: ScriptFlag[] = LIFECYCLE_HOOKS
    .filter(hook => typeof scripts[hook] === "string" && scripts[hook].trim().length > 0)
    .map(hook => ({ hook, script: scripts[hook] }));

  return {
    packageManager: "npm",
    dependencyCount: names.length,
    suspiciousScripts,
    possibleTyposquats: findTyposquats(names),
  };
}

/** Parses a requirements.txt (pip) — line-based, strips version
 * specifiers/extras/comments to get bare package names. */
function scanRequirementsTxt(text: string): ManifestScanResult {
  const names = text
    .split("\n")
    .map(l => l.split("#")[0].trim())
    .filter(l => l.length > 0)
    .map(l => l.split(/[=<>!~\[; ]/)[0].trim())
    .filter(l => l.length > 0);

  return {
    packageManager: "pip",
    dependencyCount: names.length,
    suspiciousScripts: [], // requirements.txt has no lifecycle-script concept
    possibleTyposquats: findTyposquats(names),
  };
}

export function scanManifest(text: string): ManifestScanResult | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      return scanPackageJson(trimmed);
    } catch {
      return null; // not valid JSON — caller shows a parse-error message
    }
  }
  return scanRequirementsTxt(trimmed);
}

export type ApiCallFlag = { pattern: string; line: number; snippet: string };
export type ObfuscationFlag = { line: number; snippet: string; entropy: number };
export type UrlFlag = { line: number; url: string };
export type SecretFlag = { pattern: string; line: number; masked: string };
export type SqlInjectionFlag = { line: number; snippet: string };
export type DeserializationFlag = { pattern: string; line: number; snippet: string };

export type SourceScanResult = {
  suspiciousApiCalls: ApiCallFlag[];
  obfuscationTells: ObfuscationFlag[];
  embeddedUrls: UrlFlag[];
  hardcodedSecrets: SecretFlag[];
  sqlInjectionTells: SqlInjectionFlag[];
  insecureDeserialization: DeserializationFlag[];
};

const SUSPICIOUS_API_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "eval(", regex: /\beval\s*\(/ },
  { name: "new Function(", regex: /\bnew\s+Function\s*\(/ },
  { name: "child_process.exec", regex: /child_process\s*\.\s*exec(Sync)?\s*\(/ },
  { name: 'require("child_process")', regex: /require\s*\(\s*['"]child_process['"]\s*\)/ },
  { name: "Python exec(", regex: /\bexec\s*\(/ },
  { name: "subprocess.*", regex: /\bsubprocess\s*\.\s*(run|call|Popen|check_output)\s*\(/ },
  { name: "os.system(", regex: /\bos\s*\.\s*system\s*\(/ },
];

const LONG_STRING_REGEX = /["'`]([A-Za-z0-9+/=]{40,}|[0-9a-fA-F]{40,})["'`]/g;
const URL_REGEX = /https?:\/\/[^\s"'`)]+/g;
const ENTROPY_THRESHOLD = 4.2;

// Real, recognizable secret-format prefixes (CWE-798) — near-zero false-positive
// rate since these are specific, documented formats, not generic long strings
// (which the obfuscation-entropy check above already covers separately).
const SECRET_FORMAT_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "AWS Access Key ID", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub personal access token", regex: /\bgh[po]_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "PEM private key block", regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
];

// Generic "sensitive-name = value" assignment — real secrets are common here,
// but so are docs/config placeholders, so an obvious-placeholder denylist
// (case-insensitive) is checked before flagging.
const GENERIC_SECRET_ASSIGNMENT = /\b(api[_-]?key|secret(?:[_-]?key)?|access[_-]?token|auth[_-]?token|password|passwd|client[_-]?secret)\s*[:=]\s*["']([^"'\s]{6,})["']/i;
const PLACEHOLDER_VALUES = new Set([
  "changeme", "xxx", "xxxxxxxx", "yourpassword", "your-password", "your_password",
  "<password>", "password", "secret", "token", "example", "placeholder", "test",
  "000000", "123456", "insert-key-here", "your-api-key", "your_api_key", "todo",
]);

function maskSecret(value: string): string {
  if (value.length <= 8) return `${value.slice(0, 2)}…${value.slice(-2)}`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

// SQL-injection-shaped string building (CWE-89): a line naming a SQL keyword
// combined with an interpolation/concatenation mechanism, rather than a
// parameterized placeholder (?, %s used as a real bound parameter, not
// string-formatted in).
const SQL_KEYWORD = /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i;
const SQL_FSTRING_INTERP = /f["'][^"'\n]*\{[^}]+\}[^"'\n]*["']/;
const SQL_TEMPLATE_LITERAL = /`[^`\n]*\$\{[^}]+\}[^`\n]*`/;
const SQL_CONCAT = /["'`]\s*\+|\+\s*["'`]/;
const SQL_PERCENT_FORMAT = /%[sd]["'].*%\s*[([]/;

// Insecure deserialization (CWE-502) — Python's classic, extremely
// well-documented unsafe patterns. yaml.load is only flagged when the same
// line lacks SafeLoader, PyYAML's own documented fix for this exact issue.
const DESERIALIZATION_PATTERNS: { name: string; regex: RegExp; requireAbsent?: RegExp }[] = [
  { name: "pickle.loads/load(", regex: /\bpickle\s*\.\s*loads?\s*\(/ },
  { name: "marshal.loads(", regex: /\bmarshal\s*\.\s*loads?\s*\(/ },
  { name: "yaml.load( without SafeLoader", regex: /\byaml\s*\.\s*load\s*\(/, requireAbsent: /SafeLoader/ },
];

export function scanSourceCode(text: string): SourceScanResult {
  const lines = text.split("\n");
  const suspiciousApiCalls: ApiCallFlag[] = [];
  const obfuscationTells: ObfuscationFlag[] = [];
  const embeddedUrls: UrlFlag[] = [];
  const hardcodedSecrets: SecretFlag[] = [];
  const sqlInjectionTells: SqlInjectionFlag[] = [];
  const insecureDeserialization: DeserializationFlag[] = [];

  lines.forEach((line, i) => {
    for (const { name, regex } of SUSPICIOUS_API_PATTERNS) {
      if (regex.test(line)) {
        suspiciousApiCalls.push({ pattern: name, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    }
    for (const match of line.matchAll(LONG_STRING_REGEX)) {
      const entropy = shannonEntropy(match[1]);
      if (entropy > ENTROPY_THRESHOLD) {
        obfuscationTells.push({ line: i + 1, snippet: match[1].slice(0, 40) + "…", entropy });
      }
    }
    for (const match of line.matchAll(URL_REGEX)) {
      embeddedUrls.push({ line: i + 1, url: match[0] });
    }

    for (const { name, regex } of SECRET_FORMAT_PATTERNS) {
      const m = regex.exec(line);
      if (m) hardcodedSecrets.push({ pattern: name, line: i + 1, masked: maskSecret(m[0]) });
    }
    const generic = GENERIC_SECRET_ASSIGNMENT.exec(line);
    if (generic && !PLACEHOLDER_VALUES.has(generic[2].toLowerCase())) {
      hardcodedSecrets.push({ pattern: "Hardcoded credential assignment", line: i + 1, masked: maskSecret(generic[2]) });
    }

    if (SQL_KEYWORD.test(line) && (SQL_FSTRING_INTERP.test(line) || SQL_TEMPLATE_LITERAL.test(line) || SQL_CONCAT.test(line) || SQL_PERCENT_FORMAT.test(line))) {
      sqlInjectionTells.push({ line: i + 1, snippet: line.trim().slice(0, 140) });
    }

    for (const { name, regex, requireAbsent } of DESERIALIZATION_PATTERNS) {
      if (regex.test(line) && !(requireAbsent && requireAbsent.test(line))) {
        insecureDeserialization.push({ pattern: name, line: i + 1, snippet: line.trim().slice(0, 120) });
      }
    }
  });

  return { suspiciousApiCalls, obfuscationTells, embeddedUrls, hardcodedSecrets, sqlInjectionTells, insecureDeserialization };
}

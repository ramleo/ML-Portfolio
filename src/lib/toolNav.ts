/**
 * Which area page each tool belongs to, and what that area is called.
 *
 * A plain map rather than a lookup through capabilities.ts, because that file
 * imports fifty lucide icons — pulling it into every tool page just to answer
 * "where did I come from" would put all fifty in each page's bundle.
 *
 * Generated from capabilities.ts. If a tool is added there and not here, the
 * back link falls back to the toolkit section on the home page, which is where
 * it used to go for everything.
 */
const AREA_OF: Record<string, string> = {
  "adversarial-robustness-lab": "security-trust",
  "ai-code-detector": "security-trust",
  "asl-fingerspelling-recognition": "computer-vision",
  "astrophotography-anomaly-detector": "computer-vision",
  "attack-surface-scanner": "security-trust",
  "automl": "ml-pipeline",
  "captcha-hardening-lab": "security-trust",
  "contract-invoice-reconciliation": "language-documents",
  "crime-scene-reconstruction": "computer-vision",
  "depth-parallax": "computer-vision",
  "dns-tunneling-detector": "security-trust",
  "document-intelligence": "language-documents",
  "drift": "ml-pipeline",
  "email-auth-checker": "security-trust",
  "ensemble": "ml-pipeline",
  "extension-permission-analyzer": "security-trust",
  "face-cloak": "security-trust",
  "face-deanonymization-demo": "security-trust",
  "face-liveness": "computer-vision",
  "featureeng": "ml-pipeline",
  "featureselect": "ml-pipeline",
  "gait-pattern-comparison": "computer-vision",
  "keystroke-biometric-auth-risk": "security-trust",
  "malicious-package-scanner": "security-trust",
  "malware-image-triage": "security-trust",
  "movement-form-comparison": "computer-vision",
  "multimodal-rag": "language-documents",
  "optuna": "ml-pipeline",
  "password-audit": "security-trust",
  "phishing-email-classifier": "security-trust",
  "photo-search": "computer-vision",
  "pipeline-builder": "ml-pipeline",
  "pipeline-cinema": "ml-pipeline",
  "plant-growth": "computer-vision",
  "pose-vj-visuals": "computer-vision",
  "ppe-compliance-check": "computer-vision",
  "preprocessing": "ml-pipeline",
  "prompt-injection-playground": "security-trust",
  "qr-phishing-detector": "security-trust",
  "realtime-analytics": "ml-pipeline",
  "shap": "ml-pipeline",
  "siem-alert-triage": "security-trust",
  "style-cloak": "security-trust",
  "text-prompted-video-tracking": "computer-vision",
  "text-to-image": "computer-vision",
  "text-to-sql": "language-documents",
  "tls-security-headers-scanner": "security-trust",
  "video-keystroke-inference": "security-trust",
  "wildlife-reidentification": "computer-vision",
  "yara-file-scanner": "security-trust",
};

const AREA_NAME: Record<string, string> = {
  "computer-vision": "Computer Vision",
  "language-documents": "Language & Documents",
  "ml-pipeline": "ML Pipeline",
  "security-trust": "Security & Trust",
};

/** Where a tool page's back link should go. */
export function toolBackHref(toolId: string): string {
  const slug = AREA_OF[toolId];
  return slug ? `/tools/${slug}` : "/#capabilities";
}

/** What that link should say — the area's name, or "Home" if it is unknown. */
export function toolBackLabel(toolId: string): string {
  const slug = AREA_OF[toolId];
  return slug ? AREA_NAME[slug] : "Home";
}

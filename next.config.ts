import type { NextConfig } from "next";

// Security headers — this site had NONE of these before (confirmed via
// this project's own TLS/Security-Headers Scanner, which checks for
// exactly these 6). The Content-Security-Policy here is deliberately a
// permissive baseline, not a hardened lockdown: many tool pages load
// MediaPipe WASM/models from a CDN (cdn.jsdelivr.net,
// storage.googleapis.com), call this project's own backend APIs on other
// domains, and use inline scripts/styles that Next.js itself needs — a
// strict CSP without auditing every one of ~60 tool pages' external
// resource usage first would risk silently breaking working features. This
// still closes the "header completely absent" gap and can be tightened
// incrementally later. Permissions-Policy explicitly ALLOWS camera/
// microphone for this origin (not blocks) since several real tools
// (face-liveness, pose-vj-visuals, video-keystroke-inference, etc.)
// genuinely need them.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "connect-src 'self' https: http: wss: ws:",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;

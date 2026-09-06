/** The Chatbot's inline SVG icons.
 *
 * Extracted when instrumenting the /api/chat call pushed Chatbot.tsx one line
 * past its pinned length. Icons are self-contained presentational components
 * with no state, so they are the cleanest thing to lift out.
 *
 * Inline SVG rather than an emoji or an icon font — a project rule.
 */
export function ChatIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        fill="rgba(255,255,255,0.12)" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="13" x2="13" y2="13" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

export function SparkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="var(--accent-from)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L14 9.5L22 12L14 14.5L12 22L10 14.5L2 12L10 9.5L12 2Z"
        fill="var(--accent-from)" fillOpacity={0.2} />
    </svg>
  );
}

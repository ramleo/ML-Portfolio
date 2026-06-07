/* Shared SVG icons used across About, Contact, Footer */

type IconProps = { size?: number; className?: string };

export function LinkedInIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function GitHubIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function DockerIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12.5c.3-1-.1-2-1.2-2.5-.4-.2-.9-.3-1.3-.2.1-.5 0-1-.3-1.5-.4-.5-.9-.8-1.5-.8H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14.5a3 3 0 0 0 3-2.5z" fill="currentColor" fillOpacity={0.08} />
      <rect x="4"  y="10" width="2" height="2" rx="0.4" fill="currentColor" fillOpacity={0.55} stroke="none" />
      <rect x="7"  y="10" width="2" height="2" rx="0.4" fill="currentColor" fillOpacity={0.55} stroke="none" />
      <rect x="10" y="10" width="2" height="2" rx="0.4" fill="currentColor" fillOpacity={0.55} stroke="none" />
      <rect x="7"  y="7"  width="2" height="2" rx="0.4" fill="currentColor" fillOpacity={0.55} stroke="none" />
      <rect x="10" y="7"  width="2" height="2" rx="0.4" fill="currentColor" fillOpacity={0.55} stroke="none" />
      <rect x="13" y="7"  width="2" height="2" rx="0.4" fill="currentColor" fillOpacity={0.55} stroke="none" />
    </svg>
  );
}

export function LocationIcon({ size = 16 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="10" r="3" fill="currentColor" fillOpacity={0.25} />
    </svg>
  );
}

export function CheckCircleIcon({ size = 32 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#34d399" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill="#34d399" fillOpacity={0.12} />
      <polyline points="7 12 10 15 17 8" />
    </svg>
  );
}

/* Maps string id → icon component, used in About / Contact / Footer */
export function SiteIcon({ id, size = 16 }: { id: string; size?: number }) {
  switch (id.toLowerCase()) {
    case "in":       return <LinkedInIcon size={size} />;
    case "gh":       return <GitHubIcon   size={size} />;
    case "docker":   return <DockerIcon   size={size} />;
    case "location": return <LocationIcon size={size} />;
    default:         return <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>{id}</span>;
  }
}

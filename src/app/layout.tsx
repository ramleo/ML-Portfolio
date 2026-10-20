import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Archivo } from "next/font/google";
import "./globals.css";
import KeepAlive from "@/components/KeepAlive";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import IdentityProvider, { type Me } from "@/components/IdentityProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Display face for headings. The site previously set Geist Sans on everything,
// so headings and body differed only by size and weight — legible, but it read
// as unstyled rather than designed. Archivo is a denser, slightly narrower
// grotesque: enough contrast against Geist to give headings real presence,
// close enough in construction that the two don't fight. Only the weights
// actually used are requested, and next/font self-hosts the files under
// /_next/static, so this adds no third-party origin and needs no CSP change.
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ml-portfolio-rho.vercel.app"),
  // The browser tab and the Google result are the first thing anyone reads,
  // and "ML Engineer Portfolio" framed the whole site as a CV. The personal
  // page sets its own title; this one describes the product.
  title: {
    default: "AIRaML — Free machine learning & AI tools in your browser",
    template: "%s",
  },
  description:
    "Run machine-learning and AI tools right in your browser: AutoML pipelines, computer vision, document intelligence and security analysis. Free, no signup, nothing to install.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Seed the navbar identity from a non-sensitive cookie NavAuth keeps fresh, so
  // the avatar is in the SSR HTML. Just a cookie read — no DB or auth round-trip.
  let initialMe: Me | undefined;
  try {
    const raw = (await cookies()).get("airaml_me")?.value;
    if (raw) initialMe = JSON.parse(decodeURIComponent(raw)) as Me;
  } catch { initialMe = undefined; }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable}`}
      suppressHydrationWarning
    >
      {/* Prevent flash of wrong theme */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');var p=localStorage.getItem('palette');if(p&&p!=='cosmic')document.documentElement.classList.add('palette-'+p);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <KeepAlive />
        <AnalyticsTracker />
        <IdentityProvider value={initialMe}>{children}</IdentityProvider>
      </body>
    </html>
  );
}
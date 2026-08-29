import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import KeepAlive from "@/components/KeepAlive";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://ml-portfolio-rho.vercel.app"),
  title: {
    default: "AIRaML | ML Engineer Portfolio",
    template: "%s",
  },
  description:
    "End-to-end machine learning, built and deployed — 50 live, testable tools spanning AutoML, NLP, computer vision and security, each backed by a real model or algorithm.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
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
        {children}
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AboutSite from "@/components/AboutSite";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";

/**
 * Public "About" — about the WEBSITE/product, not the owner.
 *
 * The personal portfolio (bio, degrees, career timeline, contact, resume) used
 * to live here and was world-readable. It is now PRIVATE: shown only to the
 * signed-in owner at /portfolio and to invited recruiters via a share-link at
 * /r/<token>. This page tells any visitor what AIRaML is and how it treats their
 * data — no personal information.
 */
const title = "About AIRaML — the platform";
const description =
  "AIRaML is a free collection of 50+ machine-learning and security tools that run in your browser: AutoML, computer vision, document intelligence and more. What it is, how it works, and how it handles your data.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function AboutPage() {
  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <AboutSite />
      <Footer />
    </>
  );
}

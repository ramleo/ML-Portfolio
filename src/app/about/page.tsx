import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Timeline from "@/components/Timeline";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";

/**
 * The personal half of the site.
 *
 * The root page used to carry both: a product (50 working ML tools) and a CV
 * (bio, degrees, GPA, career timeline, "available for ML roles", a resume
 * download). Those two jobs pull in opposite directions — the résumé layer is
 * exactly what a recruiter needs and exactly what makes a tool site read as a
 * student showcase. Splitting them lets each be written for its own reader
 * instead of one page doing both badly. Nothing was dropped; every section
 * that used to sit on the homepage lives here unchanged.
 */
const title = "About Ramakrishnasai Wuppalapati | AIRaML";
const description =
  "ML engineer and data scientist — the person behind AIRaML. Background, skills, career history and how to get in touch.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "profile" },
  twitter: { card: "summary_large_image", title, description },
};

export default function AboutPage() {
  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <About />
      <Skills />
      <Timeline />
      <Contact />
      <Footer />
    </>
  );
}

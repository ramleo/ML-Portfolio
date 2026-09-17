import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProjectsSection from "@/components/ProjectsSection";
import DomainSections from "@/components/DomainSections";
import HomeBelowFold from "@/components/HomeBelowFold";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import ChatbotClient from "@/components/ChatbotClient";

/**
 * The product half of the site: what a visitor can actually use.
 *
 * About, Skills, the career timeline and the hiring-oriented contact form all
 * moved to /about. They aren't gone — they're written for a different reader
 * (someone assessing the author) than this page is (someone who wants to run
 * a tool), and mixing the two made the working software read as a showcase.
 */
export default function Home() {
  return (
    <>
      <ParticleGridClient />
      <ChatbotClient />
      <Navbar />
      <Hero />
      <ProjectsSection />
      <DomainSections />
      {/* After the work itself: you've seen what there is to use, here's how
          the system behind it fits together. Deferred (ssr:false) — below the
          fold, off the initial-paint critical path. */}
      <HomeBelowFold />
      <Footer />
    </>
  );
}

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import ProjectsSection from "@/components/ProjectsSection";
import PipelineShowcase from "@/components/PipelineShowcase";
import NewsSection from "@/components/NewsSection";
import Timeline from "@/components/Timeline";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import Chatbot from "@/components/Chatbot";

export default function Home() {
  return (
    <>
      <ParticleGridClient />
      <Chatbot />
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <ProjectsSection />
      <PipelineShowcase />
      <NewsSection />
      <Timeline />
      <Contact />
      <Footer />
    </>
  );
}

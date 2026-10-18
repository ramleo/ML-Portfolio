import About from "@/components/About";
import Skills from "@/components/Skills";
import Timeline from "@/components/Timeline";
import Contact from "@/components/Contact";

/** The owner's private portfolio: the personal sections that used to live on the
 * public /about page. Now shown ONLY to the signed-in owner (/portfolio) and to
 * recruiters holding a valid share-link (/r/<token>). Composed once here so both
 * entry points render identical content. */
export default function Portfolio() {
  return (
    <>
      <About />
      <Skills />
      <Timeline />
      <Contact />
    </>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleGridClient from "@/components/ParticleGridClient";
import TestOpsDashboard from "./TestOpsDashboard";

export const metadata = {
  title: "TestOps (owner) — AIRaML",
  robots: { index: false, follow: false },
};

/** Owner-only view of the test-case automation programme: which of the ~1,795
 * documented cases are automated, what they resolve to, and what happened when
 * they ran. The API requires a session; this page additionally requires the
 * OWNER identity, same as /eval. */
export default async function TestOpsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerEmail(user?.email)) redirect("/app");

  return (
    <>
      <ParticleGridClient />
      <Navbar />
      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "120px 20px 72px" }}>
        <TestOpsDashboard />
      </main>
      <Footer />
    </>
  );
}

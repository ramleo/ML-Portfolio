import { createClient } from "@/lib/supabase/server";
import SurfaceShell from "@/components/SurfaceShell";

export const metadata = { title: "Recruiter — AIRaML" };

/** Recruiter surface. The edge proxy guarantees the visitor is signed in AND has
 * role = 'recruiter'; a placeholder home that M2 and later features build on. */
export default async function RecruiterHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <SurfaceShell
      eyebrow="Recruiter workspace"
      title="Welcome, recruiter"
      email={user?.email ?? ""}
    >
      <p style={{ color: "var(--text2)", fontSize: 14 }}>
        This is the recruiter area. A tailored overview of the portfolio and the
        candidate&apos;s work will live here.
      </p>
    </SurfaceShell>
  );
}

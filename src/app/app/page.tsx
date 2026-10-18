import { createClient } from "@/lib/supabase/server";
import SurfaceShell from "@/components/SurfaceShell";

export const metadata = { title: "Your account — AIRaML" };

/** User surface. The edge proxy guarantees a signed-in user reaches this; it is
 * a placeholder home that M2 and later features build on. */
export default async function AppHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <SurfaceShell
      eyebrow="User workspace"
      title="You're signed in"
      email={user?.email ?? ""}
    >
      <p style={{ color: "var(--text2)", fontSize: 14 }}>
        This is your account home. Tools and saved work will appear here as features ship.
      </p>
    </SurfaceShell>
  );
}

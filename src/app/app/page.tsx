import { redirect } from "next/navigation";

export const metadata = { title: "AIRaML" };

/** Post-login landing. There is no separate "workspace" page — everyone, owner
 * included, lands on the real homepage, signed in. The owner reaches their
 * private portfolio and the share-link manager from the profile menu
 * (My portfolio / Share links). The edge proxy guarantees a session first. */
export default async function AppRouter() {
  redirect("/");
}

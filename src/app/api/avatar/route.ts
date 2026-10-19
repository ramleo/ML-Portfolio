import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Profile-picture upload for the signed-in user.
 *   POST   (multipart, field "file") → upload a cropped image, set avatar_url
 *   DELETE                            → remove the image, clear avatar_url
 *
 * The user is identified from the session; the write uses the service-role key so
 * only `avatar_url` is touched (profiles has no UPDATE policy on purpose — that
 * would also expose `role`). The file is stored at "<uid>/avatar.<ext>" in the
 * public `avatars` bucket; a `?t=` suffix on the returned URL busts the cache. */

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB — a cropped square avatar is tiny
const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

async function sessionUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "no file" }, { status: 400 });
  if (!EXT[file.type])
    return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "too large" }, { status: 413 });

  const admin = createAdminClient();
  const path = `${user.id}/avatar.${EXT[file.type]}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const up = await admin.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (up.error) {
    if (/bucket.*not found/i.test(up.error.message))
      return NextResponse.json({ error: "needs_setup" }, { status: 503 });
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
  const avatar_url = `${pub.publicUrl}?t=${Date.now()}`;

  const { error } = await admin
    .from("profiles")
    .update({ avatar_url })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ avatar_url });
}

export async function DELETE() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  // Remove any stored extension variant, then clear the column.
  await admin.storage
    .from("avatars")
    .remove(Object.values(EXT).map((e) => `${user.id}/avatar.${e}`));
  const { error } = await admin
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

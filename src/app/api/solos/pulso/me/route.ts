import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removePulsoImage } from "@/lib/pulso-media";
import { hasTrustedMutationOrigin, isRateLimited, requestIp } from "@/lib/request-guard";

export async function DELETE(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  if (isRateLimited(`pulso-delete:${requestIp(request)}`, 3, 60 * 60 * 1000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const admin = createAdminClient();
  const { data: mediaPosts } = await admin.from("pulso_posts").select("media_path").eq("author_id", user.id).not("media_path", "is", null);
  const { data, error } = await supabase.rpc("pulso_delete_my_social_data");
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  for (const post of mediaPosts ?? []) if (post.media_path) await removePulsoImage(post.media_path);
  return NextResponse.json(data);
}

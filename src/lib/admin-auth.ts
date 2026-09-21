import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const context = await getAdminContext();
  if (!context) redirect("/login");
  return context;
}

export async function requirePulsoOperatorMfa(nextPath = "/admin/pulso/seguranca") {
  const context = await requireAdmin();
  const { data, error } = await context.supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error || data.currentLevel !== "aal2") {
    const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/admin/pulso/seguranca";
    redirect(`/admin/pulso/seguranca/mfa?next=${encodeURIComponent(safeNext)}`);
  }

  return context;
}

export async function getAdminContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminUserId = process.env.LBARTES_AUTHOR_ID?.trim();
  if (!adminUserId || user.id !== adminUserId) return null;

  return { supabase, user };
}

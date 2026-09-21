"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function redeemGhostQueries() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("redeem_pulso_ghost_queries");
  if (error) redirect(`/solos/pulso/recompensas?error=${encodeURIComponent(error.message)}`);
  redirect("/solos/pulso/recompensas?redeemed=1");
}

export async function redeemHeartPassDiscount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const credits = Number(formData.get("credits"));
  if (![10, 50, 100].includes(credits)) redirect("/solos/pulso/recompensas?error=invalid_discount_tier");

  const { error } = await supabase.rpc("redeem_pulso_heart_pass_discount", { p_credits: credits });
  if (error) redirect(`/solos/pulso/recompensas?error=${encodeURIComponent(error.message)}`);
  redirect("/solos/pulso/recompensas?discounted=1");
}

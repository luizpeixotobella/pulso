import { createClient } from "@/lib/supabase/server";

export type CurrentProfile = {
  userId: string;
  email: string | null;
  displayName: string;
  marketingConsent: boolean;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, marketing_consent")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name?.trim() || "Leitor",
    marketingConsent: Boolean(profile?.marketing_consent),
  };
}

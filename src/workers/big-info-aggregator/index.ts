/**
 * Bounded Big Info foundation: consented event categories, not raw-text NLP.
 * SQL owns pagination/deduplication, current consent, policy, quota and receipt.
 * New users must explicitly consent to big-info-categories-2026-09-13.
 * No worker reads post bodies, comment content or arbitrary metadata.
 */
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;
export async function runBigInfoAggregation(adminOverride?: AdminClient, operationKey?: string) {
  const admin = adminOverride ?? createAdminClient();
  const { data, error } = await admin.rpc("ghost_run_big_info", {
    p_operation_key: operationKey ?? null,
  });
  if (error) throw new Error(`big_info_failed:${error.message}`);
  if (!data || typeof data.status !== "string") throw new Error("big_info_invalid_receipt");
  return data;
}

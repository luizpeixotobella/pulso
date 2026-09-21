import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exceedsRequestSize, isRateLimited, requestIp } from "@/lib/request-guard";

const WALLET_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const CODE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (exceedsRequestSize(request, 2048)) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  if (isRateLimited(`pulso-claim:${requestIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await request.json().catch(() => null) as { claimCode?: string; walletAddress?: string } | null;
  const claimCode = body?.claimCode?.trim() ?? "";
  const walletAddress = body?.walletAddress?.trim().toLowerCase() ?? "";

  if (!CODE_PATTERN.test(claimCode) || !WALLET_PATTERN.test(walletAddress)) {
    return NextResponse.json({ error: "invalid_claim" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_pulso_ghost_reward", {
    p_claim_code: claimCode,
    p_wallet_address: walletAddress,
  });

  if (error?.message.includes("claim_bound_to_another_wallet")) {
    return NextResponse.json({ error: "claim_bound_to_another_wallet" }, { status: 409 });
  }
  if (error?.message.includes("claim_not_available")) {
    return NextResponse.json({ error: "claim_not_available" }, { status: 404 });
  }
  if (error || !data) {
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  return NextResponse.json(data);
}

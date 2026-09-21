import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("pulso_value_loop_process", { p_limit: 500 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result: data });
}

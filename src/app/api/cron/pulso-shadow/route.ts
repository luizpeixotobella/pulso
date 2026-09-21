import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runPulsoGhostShadow } from "@/lib/pulso-shadow";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ result: await runPulsoGhostShadow(request.headers.get("idempotency-key") ?? undefined) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no shadow mode." }, { status: 500 });
  }
}

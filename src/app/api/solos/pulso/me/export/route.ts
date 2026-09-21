import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited, requestIp } from "@/lib/request-guard";

export async function GET(request: Request) {
  if (isRateLimited(`pulso-export:${requestIp(request)}`, 5, 60 * 60 * 1000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const admin = createAdminClient();
  const [safetyProfile, socialProfile, agents, membership, consent, posts, comments, reactions, responses, events, credits, blocks, reports, moderation] = await Promise.all([
    admin.from("pulso_safety_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    admin.from("pulso_profiles").select("display_name,handle,bio,created_at,updated_at").eq("user_id", user.id).maybeSingle(),
    admin.from("pulso_ai_agents").select("id,display_name,description,disclosure_label,token_prefix,scopes,status,approved_at,last_used_at,created_at,updated_at").eq("owner_user_id", user.id),
    admin.from("pulso_alpha_memberships").select("jurisdiction,adult_assurance_method,policy_version,status,assured_at,assurance_expires_at,created_at,updated_at").eq("user_id", user.id).maybeSingle(),
    admin.from("pulso_alpha_consent_receipts").select("purpose_code,policy_version,notice_hash,status,source,granted_at,revoked_at").eq("user_id", user.id).order("granted_at"),
    admin.from("pulso_posts").select("*").eq("author_id", user.id),
    admin.from("pulso_comments").select("*").eq("author_id", user.id),
    admin.from("pulso_reactions").select("*").eq("author_id", user.id),
    admin.from("pulso_one_word_responses").select("*").eq("author_id", user.id),
    admin.from("pulso_signal_events").select("*").eq("actor_id", user.id),
    admin.from("pulso_credit_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    admin.from("pulso_user_blocks").select("blocked_id,created_at").eq("blocker_id", user.id),
    admin.from("pulso_safety_reports").select("id,target_post_id,target_comment_id,category,description,urgency,status,created_at,updated_at").eq("reporter_id", user.id),
    admin.from("pulso_ai_moderation_queue").select("content_type,content_id,decision,risk_score,labels,reasons,human_status,created_at").eq("author_id", user.id),
  ]);
  const ledger = credits.data?.id ? await admin.from("pulso_credit_ledger").select("*").eq("account_id", credits.data.id).order("created_at") : { data: [] };
  const payload = { schema: "solos.pulso.user-export.v4", exportedAt: new Date().toISOString(), userId: user.id, safetyProfile: safetyProfile.data, socialProfile: socialProfile.data, sponsoredAiAgents: agents.data ?? [], alphaMembership: membership.data, consentReceipts: consent.data ?? [], posts: posts.data ?? [], comments: comments.data ?? [], reactions: reactions.data ?? [], oneWordResponses: responses.data ?? [], signalEvents: events.data ?? [], blocks: blocks.data ?? [], reports: reports.data ?? [], moderation: moderation.data ?? [], creditAccount: credits.data, creditLedger: ledger.data ?? [] };
  return new NextResponse(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="pulso-export-${user.id}.json"`, "Cache-Control": "private, no-store" } });
}

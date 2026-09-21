import { createHmac, timingSafeEqual } from "node:crypto";

const STAGES = new Set(["observe", "evaluate", "propose", "review", "activate", "sync", "rollback", "error"]);
const SEVERITIES = new Set(["info", "warning", "critical"]);
const SAFE_COMPONENT = /^[a-z0-9][a-z0-9-]{1,79}$/;
const SAFE_EVENT_KEY = /^solos-daemon:evt-[0-9]{9,12}-[0-9]{1,20}$/;
const FORBIDDEN_EVIDENCE_KEY = /(^|_)(email|name|username|profile|content|input|prompt|message|text|token|secret|password|wallet|address|ip|user_id)($|_)/i;

type JsonMap = Record<string, unknown>;

export type GhostBrainInsert = {
  event_key: string;
  source: "solos_daemon";
  component: string;
  stage: string;
  algorithm_version: string | null;
  status: string;
  severity: string;
  summary: string;
  metrics: JsonMap;
  evidence: JsonMap;
  contains_personal_data: false;
  occurred_at: string;
};

export function verifyGhostBridgeSignature(
  body: string,
  timestamp: string | null,
  signatureHeader: string | null,
  secret: string,
  nowMs = Date.now(),
) {
  if (!/^\d{10}$/.test(timestamp ?? "") || !/^sha256=[0-9a-f]{64}$/.test(signatureHeader ?? "")) return false;
  const ageSeconds = Math.abs(Math.floor(nowMs / 1000) - Number(timestamp));
  if (ageSeconds > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  const received = signatureHeader!.slice(7);
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function parseGhostBrainBatch(value: unknown): GhostBrainInsert[] | null {
  if (!isMap(value) || value.schema !== "solos.ghost.brain-ingest.v1" || !Array.isArray(value.events)) return null;
  if (value.events.length < 1 || value.events.length > 100) return null;
  const parsed: GhostBrainInsert[] = [];
  const keys = new Set<string>();

  for (const candidate of value.events) {
    if (!isMap(candidate)) return null;
    const eventKey = stringField(candidate.event_key, 8, 180);
    const component = stringField(candidate.component, 2, 80);
    const stage = stringField(candidate.stage, 2, 20);
    const status = stringField(candidate.status, 1, 40);
    const severity = stringField(candidate.severity, 2, 12);
    const summary = stringField(candidate.summary, 1, 500);
    const algorithmVersion = candidate.algorithm_version === null
      ? null : stringField(candidate.algorithm_version, 1, 120);
    const occurredUnix = Number(candidate.occurred_at);
    if (
      !eventKey || !SAFE_EVENT_KEY.test(eventKey) || keys.has(eventKey)
      || candidate.source !== "solos_daemon"
      || !component || !SAFE_COMPONENT.test(component)
      || !stage || !STAGES.has(stage)
      || !status || !severity || !SEVERITIES.has(severity) || !summary
      || candidate.contains_personal_data !== false
      || (candidate.algorithm_version !== null && !algorithmVersion)
      || !isMap(candidate.metrics) || !isMap(candidate.evidence)
      || !isSafeAggregate(candidate.metrics) || !isSafeAggregate(candidate.evidence)
      || !Number.isSafeInteger(occurredUnix) || occurredUnix < 1_600_000_000 || occurredUnix > 4_102_444_800
    ) return null;
    keys.add(eventKey);
    parsed.push({
      event_key: eventKey,
      source: "solos_daemon",
      component,
      stage,
      algorithm_version: algorithmVersion,
      status,
      severity,
      summary,
      metrics: candidate.metrics,
      evidence: candidate.evidence,
      contains_personal_data: false,
      occurred_at: new Date(occurredUnix * 1000).toISOString(),
    });
  }
  return parsed;
}

function isMap(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.length >= min && value.length <= max ? value : null;
}

function isSafeAggregate(value: unknown, depth = 0): boolean {
  if (depth > 3) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= 160;
  if (Array.isArray(value)) return value.length <= 20 && value.every((item) => isSafeAggregate(item, depth + 1));
  if (!isMap(value) || Object.keys(value).length > 30) return false;
  return Object.entries(value).every(([key, item]) => (
    key.length <= 80 && !FORBIDDEN_EVIDENCE_KEY.test(key) && isSafeAggregate(item, depth + 1)
  ));
}

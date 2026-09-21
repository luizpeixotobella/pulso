const windows = new Map<string, { count: number; resetAt: number }>();

export function requestIp(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown").trim();
}

export function exceedsRequestSize(request: Request, maxBytes: number) {
  const length = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(length) && length > maxBytes;
}

export function hasTrustedMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host")?.trim();
    const configuredHost = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
    return Boolean(requestHost && (originUrl.host === requestHost || originUrl.host === configuredHost));
  } catch {
    return false;
  }
}

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  if (windows.size > 5000) {
    for (const [entryKey, value] of windows) if (value.resetAt <= now) windows.delete(entryKey);
  }
  return current.count > limit;
}

/** Keep auth continuations on this origin, including after browser URL normalization. */
export function safeAuthNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return "/";
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return "/";
    const base = "https://local.invalid";
    const url = new URL(value, base);
    return url.origin === base ? url.pathname + url.search + url.hash : "/";
  } catch { return "/"; }
}

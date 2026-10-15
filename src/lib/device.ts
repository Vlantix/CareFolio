/**
 * A short, human name for a device from its browser's User-Agent text,
 * e.g. "Chrome on Android". Good enough to recognise your own phone in
 * the Sessions list; not used for security.
 */
export function deviceLabel(userAgent: string | null) {
  const ua = userAgent ?? "";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  // Order matters: Edge and Samsung also say "Chrome"; Chrome also says "Safari".
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Firefox|FxiOS/.test(ua)
        ? "Firefox"
        : /Chrome|CriOS/.test(ua)
          ? "Chrome"
          : /Safari/.test(ua)
            ? "Safari"
            : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Unknown device";
}

export { timeOfDay as phTime } from "@/lib/dates";

/** "2 min 05 s" / "45 s" for wait messages. */
export function waitText(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

/** m••••@gmail.com — enough to recognise, not enough to read out. */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}••••@${domain}`;
}

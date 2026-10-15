import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MFA_COOKIE, isSessionLive, readMfaToken } from "@/lib/mfa";

/**
 * Runs before every page (see src/proxy.ts). Two jobs:
 *
 * 1. Keep the Supabase login fresh. Login tokens expire after an hour;
 *    this swaps in a new one and writes it back as a cookie. This is the
 *    official @supabase/ssr pattern — don't put code between creating
 *    the client and calling getClaims().
 * 2. Send people to the right step: log in -> email code -> terms -> app.
 *
 * Pages check again with requireMember()/requireAdmin(), so a mistake
 * here can't expose data. RLS in the database is the last line.
 */
// The publishable key, under either of Supabase's names for it.
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not connected to Supabase yet (no .env.local / Vercel variables):
  // let public pages load instead of crashing the whole site.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_KEY) {
    // ...but the staff area still answers with a plain 404, never an error
    // page that would hint it exists.
    const p = request.nextUrl.pathname;
    if ((p === "/admin" || p.startsWith("/admin/")) && p !== "/admin/login") return notFound(request, response);
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const path = request.nextUrl.pathname;

  // Send the user somewhere else, keeping any refreshed login cookies.
  const go = (to: string) => {
    const redirect = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  const sessionId = userId
    ? await readMfaToken(request.cookies.get(MFA_COOKIE)?.value, userId)
    : null;
  const live = sessionId ? await sessionStillLive(supabase, sessionId) : "dead";
  // A brief database hiccup: don't punish the user — let this request
  // through, and the page itself re-checks (requireMember/requireAdmin).
  const mfa = live === "live" || live === "unknown";
  // A logged-out (revoked) or expired device: drop its cookie so the user
  // goes back through log in.
  if (sessionId && live === "dead") response.cookies.delete(MFA_COOKIE);

  // Open to everyone.
  if (isPublic(path)) {
    // Already fully logged in? Skip the login screens.
    if (mfa && (path === "/login" || path === "/signup")) return go("/home");
    return response;
  }

  // Staff area: anyone who isn't a verified admin sees a plain 404.
  // (No redirect to a login page — that would reveal the portal exists.)
  if (path === "/admin" || path.startsWith("/admin/")) {
    if (!mfa) return notFound(request, response);
    const role = await getRole(supabase, userId!);
    if (role !== "admin") return notFound(request, response);
    return response;
  }

  // Everything else is the patient/caregiver app.
  if (!userId) return go("/login");
  // Already passed the code? Don't email another one.
  if (path === "/verify") return mfa ? go("/home") : response;
  if (!mfa) return go("/verify");

  // The loading screen works out where to go next by itself.
  if (path === "/loading") return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, terms_accepted_at, privacy_consent_at, onboarded_at")
    .eq("id", userId)
    .maybeSingle();
  // Staff who logged in through the patient page belong in /admin.
  if (profile?.role === "admin") return go("/admin");
  if (profile) {
    // Setup order: 3-step guide -> terms -> the app.
    const step = !profile.onboarded_at
      ? "/welcome"
      : !profile.terms_accepted_at || !profile.privacy_consent_at
        ? "/terms"
        : null;
    if (step && path !== step) return go(step);
    if (!step && (path === "/welcome" || path === "/terms")) return go("/home");
  }

  return response;
}

// Remembers recent "is this device session still live?" answers for 60
// seconds, so most page loads don't need a database lookup. Pages re-check
// without the cache (requireMember / requireAdmin), so a remote log out
// takes effect there immediately.
const sessionCache = new Map<string, { live: boolean; at: number }>();
const CACHE_MS = 60_000;

async function sessionStillLive(
  supabase: ReturnType<typeof createServerClient>,
  sessionId: string,
): Promise<"live" | "dead" | "unknown"> {
  const hit = sessionCache.get(sessionId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.live ? "live" : "dead";

  const { data, error } = await supabase
    .from("user_sessions")
    .select("created_at, revoked_at")
    .eq("id", sessionId)
    .maybeSingle();
  // Couldn't ask the database: don't cache a guess.
  if (error) return "unknown";

  const live = isSessionLive(data);
  sessionCache.set(sessionId, { live, at: Date.now() });
  // "Last seen" — the database only writes it once every 5 minutes.
  if (live) await supabase.rpc("touch_session", { p_session_id: sessionId });
  if (sessionCache.size > 5000) sessionCache.clear();
  return live ? "live" : "dead";
}

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/reset-password",
  "/admin/login",
  "/auth/callback",
  "/verify-document",
  // Supabase calls this to have us send auth emails (signature-checked).
  "/api/auth/send-email",
  "/sw.js",
  "/manifest.webmanifest",
  "/offline.html",
]);

function isPublic(path: string) {
  // /s/<token>: a doctor opening a shared summary (no login).
  return PUBLIC_PATHS.has(path) || path.startsWith("/s/");
}

async function getRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role as string | undefined;
}

/** Show the normal 404 page with a real 404 status. */
function notFound(request: NextRequest, response: NextResponse) {
  const rewrite = NextResponse.rewrite(new URL("/__not-found", request.url), { status: 404 });
  response.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
  return rewrite;
}

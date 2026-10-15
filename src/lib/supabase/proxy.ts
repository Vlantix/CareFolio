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
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Not connected to Supabase yet (no .env.local / Vercel variables):
  // let public pages load instead of crashing the whole site.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const mfa = sessionId ? await sessionStillLive(supabase, sessionId) : false;
  // A logged-out (revoked) or expired device: drop its cookie so the user
  // goes back through /verify.
  if (sessionId && !mfa) response.cookies.delete(MFA_COOKIE);

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, terms_accepted_at")
    .eq("id", userId)
    .maybeSingle();
  // Staff who logged in through the patient page belong in /admin.
  if (profile?.role === "admin") return go("/admin");
  if (profile) {
    if (!profile.terms_accepted_at && path !== "/terms") return go("/terms");
    if (profile.terms_accepted_at && path === "/terms") return go("/home");
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
) {
  const hit = sessionCache.get(sessionId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.live;

  const { data } = await supabase
    .from("user_sessions")
    .select("created_at, revoked_at")
    .eq("id", sessionId)
    .maybeSingle();
  const live = isSessionLive(data);
  sessionCache.set(sessionId, { live, at: Date.now() });
  // "Last seen" — the database only writes it once every 5 minutes.
  if (live) await supabase.rpc("touch_session", { p_session_id: sessionId });
  if (sessionCache.size > 5000) sessionCache.clear();
  return live;
}

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/reset-password",
  "/admin/login",
  "/auth/callback",
]);

function isPublic(path: string) {
  return PUBLIC_PATHS.has(path);
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

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Emailed links (like "reset your password") land here with a one-time
// ?code=. We swap it for a login, then send the user on to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login";
  // Only same-site paths, so the link can't bounce someone to another site.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/login";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/reset-password?expired=1`);
}

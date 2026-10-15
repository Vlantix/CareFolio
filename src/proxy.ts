import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 calls this "proxy" (it used to be "middleware"). It runs
// before every request that matches `config.matcher` below.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except Next's own files, images and icons.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// "Download my data" (RA 10173): everything CareFolio holds about the
// logged-in user, gathered by one database function, as a JSON file.
export async function GET() {
  const { mfa, profile } = await getAuthState();
  if (!mfa || !profile) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error || !data) return new NextResponse("Please try again", { status: 500 });
  // Audit row 'account.data_exported' (no file without it).
  const { error: auditError } = await supabase.rpc("log_my_data_export");
  if (auditError) return new NextResponse("Please try again", { status: 500 });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="carefolio-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

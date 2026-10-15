import { NextResponse, type NextRequest } from "next/server";
import { getAuthState } from "@/lib/auth";
import { loadAudit, readFilters, toCsv } from "@/lib/audit";

// CSV of the audit trail, same filters as the page. Staff only — anyone
// else gets the ordinary 404 (like every /admin address).
export async function GET(request: NextRequest) {
  const { mfa, profile } = await getAuthState();
  if (!mfa || profile?.role !== "admin") return new NextResponse("Not found", { status: 404 });

  const filters = readFilters(Object.fromEntries(request.nextUrl.searchParams));
  const rows = await loadAudit(filters, 5000);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("\uFEFF" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="carefolio-audit-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

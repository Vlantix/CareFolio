import { NextResponse, type NextRequest } from "next/server";
import { fetchDocumentFile, loadDocument } from "@/lib/documents";
import { stampPdf } from "@/lib/pdf-stamp";
import { stampTime } from "@/lib/dates";

// The protected viewer's PDF. The server fetches the file and sends back
// a copy stamped "Viewed by <name>", so even opening this address
// directly in a tab never gives an unmarked file. Audited first: no
// audit row, no file.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/documents/[id]/view">) {
  const { id } = await ctx.params;
  const found = await loadDocument(id);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const { doc, profile, supabase } = found;

  const bytes = await fetchDocumentFile(supabase, doc.file_path);
  if (!bytes) return new NextResponse("Not found", { status: 404 });

  const { error: auditError } = await supabase.rpc("log_record_event", {
    p_action: "document.viewed",
    p_patient: doc.patient_id,
    p_document: doc.id,
    p_details: {},
  });
  if (auditError) return new NextResponse("Please try again", { status: 500 });

  const stamped = await stampPdf(bytes, `Viewed by ${profile.full_name} · ${stampTime(new Date())} · CareFolio`);
  return new NextResponse(Buffer.from(stamped), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

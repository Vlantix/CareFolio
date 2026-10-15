import { NextResponse, type NextRequest } from "next/server";
import { fetchDocumentFile, loadDocument } from "@/lib/documents";
import { stampPdf } from "@/lib/pdf-stamp";
import { stampTime } from "@/lib/dates";

// Download: checks access, then stamps EVERY page with who downloaded it
// and when, so a copy that leaks can be traced. Audited as
// 'document.downloaded'; if that audit row can't be written, the file
// is not sent.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/documents/[id]/download">) {
  const { id } = await ctx.params;
  const found = await loadDocument(id);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const { doc, profile, supabase } = found;

  const bytes = await fetchDocumentFile(supabase, doc.file_path);
  if (!bytes) return new NextResponse("Not found", { status: 404 });

  const { error: auditError } = await supabase.rpc("log_record_event", {
    p_action: "document.downloaded",
    p_patient: doc.patient_id,
    p_document: doc.id,
    p_details: {},
  });
  if (auditError) return new NextResponse("Please try again", { status: 500 });

  const stamped = await stampPdf(bytes, `Downloaded by ${profile.full_name} · ${stampTime(new Date())} · CareFolio`);
  const filename = `${doc.title.replace(/[^\w\- ]+/g, "").trim() || "document"}.pdf`;
  return new NextResponse(Buffer.from(stamped), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

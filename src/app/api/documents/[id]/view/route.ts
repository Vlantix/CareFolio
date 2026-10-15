import { NextResponse, type NextRequest } from "next/server";
import { loadDocument } from "@/lib/documents";

// Opens a document for the protected viewer: checks access, records the
// view, then sends the browser to a signed link that works for 60 s.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/documents/[id]/view">) {
  const { id } = await ctx.params;
  const found = await loadDocument(id);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const { doc, supabase } = found;

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
  if (error || !data) return new NextResponse("Not found", { status: 404 });

  await supabase.rpc("log_record_event", {
    p_action: "document.viewed",
    p_patient: doc.patient_id,
    p_document: doc.id,
    p_details: {},
  });
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "no-store" } });
}

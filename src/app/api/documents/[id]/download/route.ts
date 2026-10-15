import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { loadDocument } from "@/lib/documents";

// Download: checks access, then stamps EVERY page with who downloaded it
// and when, so a copy that leaks can be traced. Audited as
// 'document.downloaded'.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/documents/[id]/download">) {
  const { id } = await ctx.params;
  const found = await loadDocument(id);
  if (!found) return new NextResponse("Not found", { status: 404 });
  const { doc, profile, supabase } = found;

  // A 60-second signed link, fetched by the server (never shown to the user).
  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_path, 60);
  if (error || !signed) return new NextResponse("Not found", { status: 404 });
  const file = await fetch(signed.signedUrl);
  if (!file.ok) return new NextResponse("Not found", { status: 404 });

  const when = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date());
  const stamp = safeText(`Downloaded by ${profile.full_name} · ${when} · CareFolio`);

  const pdf = await PDFDocument.load(await file.arrayBuffer());
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    // Footer line on every page…
    page.drawText(stamp, { x: 24, y: 14, size: 8, font, color: rgb(0.29, 0.38, 0.39) });
    // …and a faint diagonal copy across the middle.
    page.drawText(stamp, {
      x: width * 0.12,
      y: height * 0.3,
      size: 14,
      font,
      color: rgb(0.04, 0.43, 0.41),
      opacity: 0.12,
      rotate: degrees(35),
    });
  }
  const bytes = await pdf.save();

  await supabase.rpc("log_record_event", {
    p_action: "document.downloaded",
    p_patient: doc.patient_id,
    p_document: doc.id,
    p_details: {},
  });

  const filename = `${doc.title.replace(/[^\w\- ]+/g, "").trim() || "document"}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** The built-in PDF font only knows Western characters; swap the rest. */
function safeText(text: string) {
  return text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
}

import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BackButton } from "@/components/ui/page-header";
import { PdfCanvas } from "@/components/pdf-canvas";
import { ProtectedView } from "@/components/protected-view";
import { requireMember } from "@/lib/auth";
import { loadDocument } from "@/lib/documents";
import { maskEmail } from "@/lib/device";
import { shortDate } from "@/lib/records";

export const metadata = { title: "Document · CareFolio" };

// design/MDocView.html (mobile) and design/DDocView.html (desktop).
export default async function DocumentPage({ params }: PageProps<"/records/[id]">) {
  const profile = await requireMember();
  const { id } = await params;
  const found = await loadDocument(id);
  if (!found) notFound();
  const { doc } = found;

  return (
    <main className="flex flex-col gap-4 px-5 pt-5 pb-6 md:max-w-4xl md:px-10 md:py-8">
      <div className="flex items-center gap-3">
        <BackButton href="/records" label="Back to records" />
        <h1 className="flex-1 font-heading text-xl font-bold">{doc.title}</h1>
        <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-[5px] text-xs font-bold text-primary-deep">
          <ShieldCheck size={14} aria-hidden /> Protected view
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground">
        {doc.facility} · Released document dated {shortDate(doc.record_date)} · Code{" "}
        <strong className="text-primary-deep">{doc.verification_code}</strong>
      </p>

      <ProtectedView
        viewerName={profile.full_name}
        viewerEmail={maskEmail(profile.email)}
        patientId={doc.patient_id}
        documentId={doc.id}
        className="overflow-hidden rounded-button border border-border"
      >
        <PdfCanvas src={`/api/documents/${doc.id}/view`} title={doc.title} />
      </ProtectedView>

      <p className="text-[13px] leading-[1.45] text-muted-foreground">
        This view blurs when you switch apps or press Print Screen, and every copy is
        watermarked with your name and time.
      </p>
      <a
        href={`/api/documents/${doc.id}/download`}
        className="flex h-[52px] items-center justify-center rounded-button bg-primary font-semibold text-primary-foreground no-underline hover:bg-primary-hover hover:text-primary-foreground md:self-start md:px-8"
      >
        Download PDF
      </a>
    </main>
  );
}

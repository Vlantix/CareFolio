import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

/** Same limit as the storage bucket (008-review-fixes.sql). */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

// pdf-lib can't read CSS tokens; these match --muted-foreground (#4b6164)
// and --primary (#0b6e69).
const MUTED = rgb(0.29, 0.38, 0.39);
const TEAL = rgb(0.04, 0.43, 0.41);

/**
 * Stamps every page with `line` (a footer plus a faint diagonal copy), so
 * any copy that leaves CareFolio points back to who opened it and when.
 */
export async function stampPdf(bytes: ArrayBuffer, line: string) {
  // The built-in font only knows Western characters; swap the rest.
  const text = line.replace(/[^\x20-\x7E -ÿ]/g, "?");
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(text, { x: 24, y: 14, size: 8, font, color: MUTED });
    page.drawText(text, {
      x: width * 0.12,
      y: height * 0.3,
      size: 14,
      font,
      color: TEAL,
      opacity: 0.12,
      rotate: degrees(35),
    });
  }
  return pdf.save();
}

/** Largest PDF staff can upload (Vercel accepts at most ~4.5 MB per request). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * The records office's release stamp: a footer line on every page,
 * e.g. "Verify at https://…/verify-document  Code CF-7Q4K-92XM".
 */
export async function stampReleaseFooter(bytes: ArrayBuffer, line: string) {
  const text = line.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height: 30, color: rgb(1, 1, 1), opacity: 0.9 });
    page.drawText(text, { x: 24, y: 11, size: 8.5, font, color: TEAL });
  }
  return pdf.save();
}

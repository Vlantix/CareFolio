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

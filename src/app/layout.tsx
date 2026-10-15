import type { Metadata, Viewport } from "next";
import { Figtree, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Body text. Exposed as a CSS variable that globals.css turns into font-sans.
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
});

// Headings. Use the `font-heading` class.
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-schibsted",
});

export const metadata: Metadata = {
  title: "CareFolio",
  description:
    "Request and download your official lab results from the hospital — no trip, no queue.",
};

export const viewport: Viewport = {
  themeColor: "#0E293C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${schibsted.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

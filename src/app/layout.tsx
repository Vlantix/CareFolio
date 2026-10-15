import type { Metadata, Viewport } from "next";
import { Figtree, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { Splash } from "@/components/splash";
import { ServiceWorker } from "@/components/pwa";
import { SPLASH_SEEN_KEY } from "@/lib/splash";

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
      // The script below may add a class before React loads; that's expected.
      suppressHydrationWarning
    >
      <head>
        {/* Runs before the first paint: if the splash was already shown in
            this browser session, hide it so it never flashes. Fixed text,
            no user input. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=location.pathname;if(sessionStorage.getItem("${SPLASH_SEEN_KEY}")||p.indexOf("/s/")===0||p==="/verify-document")document.documentElement.classList.add("cf-splash-seen")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Splash />
        <ServiceWorker />
      </body>
    </html>
  );
}

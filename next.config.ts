import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Staff upload PDFs through server actions. Vercel accepts at most
  // ~4.5 MB per request, so the app limits PDFs to 4 MB.
  experimental: {
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  // Keep the staff area out of search engines. (Not listed in robots.txt
  // on purpose: that file is public and would advertise the URL.)
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/admin", headers: noindex },
      // The service worker must never be served from a stale cache.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/admin/:path*", headers: noindex },
      // Shared summaries: never indexed, never cached anywhere.
      {
        source: "/s/:path*",
        headers: [
          ...noindex,
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },

  // Cache Components and Partial Prefetching are deliberately OFF.
  //
  // With them on, any page that reads from the database (or uses
  // cookies, headers or searchParams) fails the build unless it is
  // wrapped in <Suspense> or marked with "use cache". That is a fine
  // trade for a production team tuning performance; for a team writing
  // its first database query it is an opaque build error at exactly
  // the wrong moment.
  //
  // Turn them back on later if you want them, and read:
  // https://nextjs.org/docs/messages/blocking-prerender-dynamic
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

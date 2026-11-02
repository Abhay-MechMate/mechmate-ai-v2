import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents off: the authenticated pages (garage, diagnose/*) read
  // cookies at the top level with no <Suspense>, which cacheComponents rejects.
  // They avoid Suspense on purpose - see the note in src/app/diagnose/page.tsx.
  cacheComponents: false,
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

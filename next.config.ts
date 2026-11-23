import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NutriGoal pages are per-user and dynamic, so we use the standard
  // request-time rendering model rather than Cache Components.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // Medical checkup reports (PDF / image) can be a few MB.
      bodySizeLimit: "12mb",
    },
  },
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local, in-process Postgres used in development) ships WASM
  // files, so it must be loaded from node_modules rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    serverActions: {
      // CV uploads go through server actions; allow up to the 2 MB file cap plus form overhead.
      bodySizeLimit: "3mb",
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

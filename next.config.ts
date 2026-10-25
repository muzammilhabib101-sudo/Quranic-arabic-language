import type { NextConfig } from "next";

// "" for a domain root; "/repo" for a GitHub Pages project site (the deploy
// workflow sets it). See src/lib/base-path.ts.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Fully static site: `next build` writes plain HTML/CSS/JS to /out
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
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

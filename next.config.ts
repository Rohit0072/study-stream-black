import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /* config options here */
  output: "export", // Disabled to allow API routes for dev/verification
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;

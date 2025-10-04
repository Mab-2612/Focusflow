// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Remove the experimental.serverExternalPackages - it's not needed
  // The Google Generative AI package should work without this
};

export default nextConfig;
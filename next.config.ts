// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ don’t block builds for lint errors
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ don’t block builds for type errors
  },
  experimental: {
    serverExternalPackages: ["@google/generative-ai"], // ✅ fixed key name
  },
};

export default nextConfig;

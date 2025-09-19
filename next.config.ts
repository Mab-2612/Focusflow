// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Remove this if it exists:
  // output: 'export',
  
  // Add these if you need them:
  experimental: {
    serverComponentsExternalPackages: ['@google/generative-ai'],
  },
}

export default nextConfig
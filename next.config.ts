import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Enable standalone output for Docker deployment
  // This creates a minimal production build in .next/standalone
  output: 'standalone',
  deploymentId: process.env.DEPLOYMENT_ID,
}

export default nextConfig

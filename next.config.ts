import type { NextConfig } from 'next'
import createMDX from '@next/mdx'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Enable standalone output for Docker deployment
  // This creates a minimal production build in .next/standalone
  output: 'standalone',
  deploymentId: process.env.DEPLOYMENT_ID,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  experimental: {
    webpackMemoryOptimizations: true,
  },
}

const withMDX = createMDX({})

export default withMDX(nextConfig)

import { headers } from 'next/headers'

export async function getRequestMetadata(): Promise<{
  ipAddress?: string
  userAgent?: string
}> {
  try {
    const headersList = await headers()

    // Extract IP address - customize based on hosting provider
    // Vercel/Netlify: x-real-ip
    // Cloudflare: cf-connecting-ip
    const ipAddress = headersList.get('x-real-ip') || undefined

    // Extract user agent
    const userAgent = headersList.get('user-agent') || undefined

    return { ipAddress, userAgent }
  } catch (error) {
    console.warn('Failed to extract request metadata:', error)
    return { ipAddress: undefined, userAgent: undefined }
  }
}

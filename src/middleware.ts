import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Scope locale routing to the translated surfaces only — the landing (`/`,
  // `/ko`, `/ja`) and the field manual. Pricing, legal, patchnotes, the authed
  // app, and API routes stay single-language and untouched.
  matcher: ['/', '/(ko|ja)/:path*', '/field-manual/:path*'],
}

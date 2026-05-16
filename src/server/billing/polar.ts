import 'server-only'
import { Polar } from '@polar-sh/sdk'
import { requirePolarConfig } from '@/server/config'

let cachedClient: Polar | null = null

export function getPolarServerClient(): Polar {
  if (cachedClient == null) {
    const polar = requirePolarConfig()
    cachedClient = new Polar({
      accessToken: polar.accessToken,
      server: polar.environment,
    })
  }
  return cachedClient
}

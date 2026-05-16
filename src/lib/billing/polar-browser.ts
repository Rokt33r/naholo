import type { PolarEmbedCheckout } from '@polar-sh/checkout/embed'

let polarEmbedPromise: Promise<typeof PolarEmbedCheckout> | null = null

export function loadPolarCheckout(): Promise<typeof PolarEmbedCheckout> {
  if (polarEmbedPromise == null) {
    polarEmbedPromise = import('@polar-sh/checkout/embed').then(
      (mod) => mod.PolarEmbedCheckout,
    )
  }
  return polarEmbedPromise
}

import 'server-only'
import {
  upsertPolarSubscription,
  type PolarSubscription,
} from './polar-subscription'
import { getPolarServerClient } from '../billing/polar'

export type ReconcileProjectSubscriptionResult =
  | { found: false }
  | {
      found: true
      polarSubscription: PolarSubscription
      status: string
    }

export async function reconcileProjectSubscriptionFromPolar(
  projectId: string,
): Promise<ReconcileProjectSubscriptionResult> {
  const polar = getPolarServerClient()

  let activeSubscriptionId: string
  try {
    const state = await polar.customers.getStateExternal({
      externalId: projectId,
    })
    const [first] = state.activeSubscriptions
    if (first == null) {
      return { found: false }
    }
    activeSubscriptionId = first.id
  } catch (error) {
    // The Polar SDK throws on 404 when the externalId is unknown — treat as
    // "nothing to reconcile" so a brand-new project can proceed to checkout.
    if (isPolarNotFound(error)) {
      return { found: false }
    }
    throw error
  }

  const full = await polar.subscriptions.get({ id: activeSubscriptionId })
  const polarSubscription = await upsertPolarSubscription(full)

  return {
    found: true,
    polarSubscription,
    status: polarSubscription.status,
  }
}

function isPolarNotFound(error: unknown): boolean {
  if (error == null || typeof error !== 'object') {
    return false
  }
  const status = (error as { statusCode?: unknown; status?: unknown })
    .statusCode
  const altStatus = (error as { status?: unknown }).status
  return status === 404 || altStatus === 404
}

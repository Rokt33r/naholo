import { NextRequest, NextResponse } from 'next/server'
import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks.js'
import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js'
import type { Customer } from '@polar-sh/sdk/models/components/customer.js'
import { requirePolarConfig } from '@/server/config'
import { recordPolarWebhookEvent } from '@/server/services/polar-webhook-event'
import {
  upsertPolarSubscription,
  patchPolarSubscriptionBillingEmail,
} from '@/server/services/polar-subscription'
import { claimPolarProjectSubscriptionFromEvent } from '@/server/services/polar-project-subscription'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value
  })

  let event
  try {
    event = validateEvent(rawBody, headers, requirePolarConfig().webhookSecret)
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    console.error('Polar webhook parse failure:', error)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const webhookEventId = headers['webhook-id'] ?? null

  try {
    await recordPolarWebhookEvent({
      eventDataId: event.data.id,
      webhookEventId,
      eventType: event.type,
      eventTimestamp: event.timestamp,
      payload: event,
    })
  } catch (error) {
    console.error('Polar webhook event record failure:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'subscription.created':
      case 'subscription.active':
      case 'subscription.updated':
      case 'subscription.canceled':
      case 'subscription.uncanceled':
      case 'subscription.past_due':
      case 'subscription.revoked': {
        const subscription = event.data as Subscription
        const { row } = await upsertPolarSubscription(subscription)
        if (event.type === 'subscription.created') {
          const claim = await claimPolarProjectSubscriptionFromEvent({
            polarSubscriptionRow: row,
            metadata: subscription.metadata,
          })
          if (!claim.claimed) {
            console.warn(
              'Polar subscription.created claim skipped:',
              claim.reason,
              { polarSubscriptionId: subscription.id },
            )
          }
        }
        break
      }
      case 'customer.created':
      case 'customer.updated': {
        const customerData = event.data as Customer
        if (customerData.email != null) {
          await patchPolarSubscriptionBillingEmail({
            polarCustomerId: customerData.id,
            billingEmail: customerData.email,
          })
        }
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error('Polar webhook handler error:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

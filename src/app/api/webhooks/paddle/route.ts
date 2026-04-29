import { NextRequest, NextResponse } from 'next/server'
import { EventName, Webhooks } from '@paddle/paddle-node-sdk'
import { upsertFromPaddleEvent } from '@/server/services/project-subscription'
import '@/server/billing/paddle'

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (secret == null || secret === '') {
    console.error('PADDLE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const signature = request.headers.get('Paddle-Signature')
  if (signature == null) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const rawBody = await request.text()

  let event
  try {
    event = await new Webhooks().unmarshal(rawBody, secret, signature)
  } catch (error) {
    console.error('Paddle webhook signature/parse failure:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (event == null) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionImported:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionUpdated: {
        const data = event.data
        await upsertFromPaddleEvent({
          eventType: event.eventType,
          data: {
            id: data.id,
            customerId: data.customerId,
            status: data.status,
            items: data.items.map((item) => ({ quantity: item.quantity })),
            currentBillingPeriod:
              data.currentBillingPeriod == null
                ? null
                : {
                    startsAt: data.currentBillingPeriod.startsAt,
                    endsAt: data.currentBillingPeriod.endsAt,
                  },
            nextBilledAt: data.nextBilledAt,
            canceledAt: data.canceledAt,
            scheduledChange:
              data.scheduledChange == null
                ? null
                : {
                    effectiveAt: data.scheduledChange.effectiveAt,
                    action: data.scheduledChange.action,
                  },
            customData:
              data.customData == null
                ? null
                : {
                    projectId: data.customData.projectId as string | undefined,
                  },
            trialDates:
              data.items[0]?.trialDates == null
                ? null
                : { endsAt: data.items[0].trialDates.endsAt },
          },
        })
        break
      }
      default:
        break
    }
  } catch (error) {
    console.error('Paddle webhook handler error:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

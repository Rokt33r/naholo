import { NextRequest, NextResponse } from 'next/server'
import {
  EventName,
  Webhooks,
  type SubscriptionNotification,
  type CustomerNotification,
} from '@paddle/paddle-node-sdk'
import { recordPaddleWebhookEvent } from '@/server/services/paddle-webhook-event'
import {
  upsertPaddleSubscriptionFromEvent,
  patchPaddleSubscriptionBillingEmail,
} from '@/server/services/paddle-subscription'
import { claimProjectSubscriptionFromEvent } from '@/server/services/project-subscription'
import { requirePaddleConfig } from '@/server/config'
import { getPaddleServerClient } from '@/server/billing/paddle'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('Paddle-Signature')
  if (signature == null) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const rawBody = await request.text()

  // Ensure Paddle SDK crypto runtime is initialized before signature checks.
  getPaddleServerClient()

  let event
  try {
    event = await new Webhooks().unmarshal(
      rawBody,
      requirePaddleConfig().webhookSecret,
      signature,
    )
  } catch (error) {
    console.error('Paddle webhook signature/parse failure:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (event == null) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const eventType = event.eventType
  const occurredAt = new Date(event.occurredAt)

  const data = event.data as { id?: string; subscriptionId?: string | null }
  const isSubEvent = isSubscriptionEvent(eventType)
  const isTxEvent = isTransactionEvent(eventType)
  const paddleSubscriptionId = isSubEvent
    ? (data.id ?? null)
    : isTxEvent
      ? (data.subscriptionId ?? null)
      : null
  const paddleTransactionId = isTxEvent ? (data.id ?? null) : null

  let recorded
  try {
    recorded = await recordPaddleWebhookEvent({
      eventId: event.eventId,
      eventType,
      occurredAt,
      paddleTransactionId,
      paddleSubscriptionId,
      payload: event,
    })
  } catch (error) {
    console.error('Paddle webhook event record failure:', error)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  if (!recorded.inserted) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    switch (eventType) {
      case EventName.SubscriptionCreated: {
        const subscriptionData = event.data as SubscriptionNotification
        const { row } = await upsertPaddleSubscriptionFromEvent({
          data: subscriptionData,
          occurredAt,
        })
        const claim = await claimProjectSubscriptionFromEvent({
          paddleSubscriptionRow: row,
          customData: subscriptionData.customData,
        })
        if (!claim.claimed) {
          console.warn(
            `Paddle subscription.created not claimed: reason=${claim.reason} paddleSubscriptionId=${row.paddleSubscriptionId}`,
          )
        }
        break
      }
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionCanceled:
      case EventName.SubscriptionImported:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionUpdated: {
        await upsertPaddleSubscriptionFromEvent({
          data: event.data as SubscriptionNotification,
          occurredAt,
        })
        break
      }
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
      case EventName.CustomerImported: {
        const customerData = event.data as CustomerNotification
        await patchPaddleSubscriptionBillingEmail({
          paddleCustomerId: customerData.id,
          billingEmail: customerData.email,
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

function isSubscriptionEvent(eventType: string): boolean {
  switch (eventType) {
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionCanceled:
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionImported:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed:
    case EventName.SubscriptionTrialing:
    case EventName.SubscriptionUpdated:
      return true
    default:
      return false
  }
}

function isTransactionEvent(eventType: string): boolean {
  switch (eventType) {
    case EventName.TransactionBilled:
    case EventName.TransactionCanceled:
    case EventName.TransactionCompleted:
    case EventName.TransactionCreated:
    case EventName.TransactionPaid:
    case EventName.TransactionPastDue:
    case EventName.TransactionPaymentFailed:
    case EventName.TransactionReady:
    case EventName.TransactionUpdated:
      return true
    default:
      return false
  }
}

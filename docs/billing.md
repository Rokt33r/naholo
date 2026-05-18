# Billing

## Overview

Naholo bills per project on [Polar.sh](https://polar.sh). Each project has one
subscription, priced per active human operator seat (bots are free and don't
count toward the seat quantity). Polar is the merchant of record; we never
touch payment-method data.

If you're agent, must check polar's doc for llm before making any changes.

https://polar.sh/docs/llms-full.txt

The integration runs on two parallel tracks against a single `polar_subscriptions`
DB row:

1. **Embedded checkout (initial purchase + plan changes)**. The subscription
   page opens Polar's embedded checkout (`@polar-sh/checkout`) for the
   product's per-seat price. The checkout is **server-issued** by
   `POST /api/projects/[slug]/billing/checkout`, which returns
   `{ url, expiresAt }`. The browser hands that URL to `PolarEmbedCheckout.create`.
   The buyer completes payment inside the iframe; on success the page receives
   an event and starts polling `/api/projects/[slug]/active-project-subscription`
   until the webhook lands. We do **not** finalize anything client-side — the
   webhook is the only source of truth.
2. **Webhooks (everything after first purchase)**. Renewals, status changes
   (`active`, `trialing`, `past_due`, `canceled`, `incomplete`,
   `incomplete_expired`), seat changes, and customer billing-email changes all
   flow through `/api/webhooks/polar`. The handler verifies the signature via
   `validateEvent` from the Polar SDK, persists the raw event in
   `polar_webhook_events` for audit, then upserts the `polar_subscriptions`
   row via `upsertPolarSubscription`. A `subscription.created` event additionally
   runs `claimPolarProjectSubscriptionFromEvent` to link the new row to a
   `project_subscriptions` row using `metadata.{projectId, projectOperatorId}`
   set at checkout time.

`polar_subscriptions` mirrors Polar's `Subscription` resource one-to-one (status,
seats, `current_period_*`, `trial_*`, `cancel_at_period_end`, `started_at`,
`ends_at`, `ended_at`, `modified_at`). The `modified_at` field is used as the
out-of-order guard: if the incoming event's `data.modifiedAt` is older than the
stored value, the upsert is a no-op.

## Flow diagram

```
                                BROWSER
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  1. User clicks "Create Project"                                       │
│     └─> create-project-dialog → createProjectAction()                  │
│                                                                        │
│  2. router.push(/app/projects/[slug])                                  │
│                                                                        │
│  3. ProjectSubscriptionWall sees no polarSubscription                  │
│     ├─ admin     → renders <Link href="/subscription">                 │
│     └─ non-admin → "Ask a project admin" copy                          │
│                                                                        │
│  4. SubscriptionPage opens embedded checkout                           │
│     POST /api/projects/[slug]/billing/checkout                         │
│       └─> polar.checkouts.create({                                     │
│             products: [productId],                                     │
│             externalCustomerId: project.id,    // first time only      │
│             customerId: existingPolarCustomerId, // subsequent         │
│             metadata: { projectId, projectOperatorId },                │
│             minSeats: max(1, currentHumanOperators),                   │
│             allowDiscountCodes: true,                                  │
│           })                                                           │
│       └─ returns { url, expiresAt }                                    │
│                                                                        │
│  5. PolarEmbedCheckout.create(url).open()                              │
│     └─ buyer completes payment in iframe                               │
│     └─ on 'success' → page invalidates active-project-subscription     │
│       query and starts polling                                         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

                                SERVER
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Polar POSTs /api/webhooks/polar (subscription.created)                │
│   1. validateEvent(headers, body, webhookSecret)                       │
│   2. INSERT polar_webhook_events (full payload, event_type, ts)        │
│   3. upsertPolarSubscription(event.data)                               │
│        → inserts polar_subscriptions row                               │
│   4. claimPolarProjectSubscriptionFromEvent(...)                       │
│        → reads metadata.{projectId, projectOperatorId}                 │
│        → inserts project_subscriptions row + sets active id            │
│                                                                        │
│  Subsequent events (subscription.updated, .active, .canceled,          │
│  .revoked, customer.updated, customer.created) hit the same handler.   │
│  upsertPolarSubscription is idempotent on (polar_subscription_id) and  │
│  out-of-order-guarded via modified_at.                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Customer portal (manage subscription)

`POST /api/projects/[slug]/billing/portal` opens Polar's customer portal for the
calling admin operator:

1. Look up the project's `polar_subscriptions.polarCustomerId`. 404 if absent.
2. Upsert a Polar **member** for this admin operator on that customer
   (`polar.members.createMember({ customerId, email, externalId: projectOperator.id, role: 'billing_manager' })`).
   Polar's member model is enabled automatically the moment a customer makes
   any seat-based purchase, so a customer-scoped (not member-scoped) portal
   session is rejected with `member_id is required for team customers.`
   The Members API dedupes by `email`, so calling `createMember` repeatedly
   for the same operator returns the existing member's id.
3. Create the session: `polar.customerSessions.create({ customerId, memberId: member.id })`.
4. Return `{ url: session.customerPortalUrl }`. The page opens the URL in a new
   tab.

Seat changes, plan changes, cancellation, resumption, payment-method edits, and
invoice access all happen inside the Polar-hosted portal — we no longer have
in-app `SeatControls` / "Change seats" buttons. `assertSeatAvailable` is still
enforced server-side, so operators can't be added beyond the current seat count.

## Environment variables

Server (`requirePolarConfig`):

| Var                    | Source             | Notes                                                                                                                                   |
| ---------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `BILLING`              | ECS env            | `"true"` to enable billing flows.                                                                                                       |
| `POLAR_ACCESS_TOKEN`   | Secrets Manager    | Scopes: `checkouts:write`, `subscriptions:read/write`, `customers:read/write`, `members:read/write`, `discounts:read`, `webhooks:read`. |
| `POLAR_WEBHOOK_SECRET` | Secrets Manager    | Polar webhook destination's signing secret.                                                                                             |
| `POLAR_PRODUCT_ID`     | ECS env            | Polar product id for the per-seat product. Must match `NEXT_PUBLIC_POLAR_PRODUCT_ID`.                                                   |
| `POLAR_ENVIRONMENT`    | ECS env (optional) | `"production"` or `"sandbox"`. Defaults to `"sandbox"`.                                                                                 |

Browser (`publicConfig.polar`):

| Var                             | Source           |
| ------------------------------- | ---------------- |
| `NEXT_PUBLIC_BILLING`           | Docker build arg |
| `NEXT_PUBLIC_POLAR_PRODUCT_ID`  | Docker build arg |
| `NEXT_PUBLIC_POLAR_ENVIRONMENT` | Docker build arg |

## Code map

| Layer                | Path                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------- |
| Server SDK singleton | `src/server/billing/polar.ts`                                                           |
| Browser embed loader | `src/lib/billing/polar-browser.ts`                                                      |
| Webhook handler      | `src/app/api/webhooks/polar/route.ts`                                                   |
| Webhook upsert       | `src/server/services/polar-subscription.ts`                                             |
| Claim handler        | `claimPolarProjectSubscriptionFromEvent` in `src/server/services/polar-subscription.ts` |
| Active sub read      | `src/server/services/project-subscription.ts` → `getActiveProjectSubscription`          |
| Seat gate            | `assertSeatAvailable` in the same service                                               |
| Checkout route       | `src/app/api/projects/[projectSlug]/billing/checkout/route.ts`                          |
| Portal route         | `src/app/api/projects/[projectSlug]/billing/portal/route.ts`                            |
| Cancellation route   | `src/app/api/projects/[projectSlug]/billing/cancellation/route.ts`                      |
| Subscription page    | `src/app/app/projects/[projectSlug]/subscription/page.tsx`                              |
| Subscription readout | `subscription/subscription-readout.tsx`                                                 |
| Cancellation UI      | `subscription/cancellation-controls.tsx`                                                |
| Wall (gate)          | `src/components/billing/project-subscription-wall.tsx`                                  |
| Settings tab         | `src/components/settings/billing-tab.tsx`                                               |
| Admin readout        | `src/app/admin/polar-subscriptions/`, `src/app/admin/polar-webhook-events/`             |

## Schema

```
polar_subscriptions
  id                      uuid pk
  polar_subscription_id   text unique
  polar_customer_id       text
  billing_email           text
  metadata                jsonb
  status                  text  (Polar's SubscriptionStatus verbatim)
  seats                   integer nullable
  current_period_start    timestamp
  current_period_end      timestamp
  trial_start             timestamp
  trial_end               timestamp
  cancel_at_period_end    boolean default false
  canceled_at             timestamp
  started_at              timestamp
  ends_at                 timestamp
  ended_at                timestamp
  modified_at             timestamp  (out-of-order guard)
  created_at              timestamp
  updated_at              timestamp

polar_webhook_events
  id               uuid pk
  event_data_id    text   (Polar's data.id — subscription id for sub.* events)
  webhook_event_id text   (Polar's event.id)
  event_type       text
  event_timestamp  timestamp
  payload          jsonb
  created_at       timestamp

project_subscriptions
  id                       uuid pk
  project_id               uuid
  polar_subscription_id    uuid → polar_subscriptions.id
  created_by_operator_id   uuid → project_operators.id
  created_at, updated_at   timestamp
```

## Webhook events handled

- `subscription.created` — upsert + claim into `project_subscriptions`
- `subscription.updated` — upsert
- `subscription.active` — upsert
- `subscription.canceled` — upsert
- `subscription.revoked` — upsert
- `customer.created` — `patchPolarSubscriptionBillingEmail`
- `customer.updated` — `patchPolarSubscriptionBillingEmail`

Unknown event types are accepted (recorded in `polar_webhook_events`) but do
not trigger upserts.

## Troubleshooting

- **`Customer does not exist` on portal session** — the customer in
  `polar_subscriptions.polar_customer_id` is referenced by Polar's
  `customer_id`, not `external_customer_id`. The portal route uses
  `customerId` (Polar UUID), not `externalCustomerId`.
- **`Member does not exist for this customer`** — checkout-created
  customers are auto-upgraded to "team customers" on first seat purchase, and
  member-scoped portal sessions are mandatory. The portal route calls
  `members.createMember` first to ensure a member exists, then uses
  `memberId: member.id` (not `externalMemberId`) because Polar does not honor
  the user-supplied `external_id` on member create.
- **Webhook upsert fails with `invalid input syntax for type ...`** — the
  schema migration history is non-trivial (`cancel_at_period_end` was renamed
  from `cancel_at` and required a column-type fix in `0040_*`). If you see a
  similar mismatch, check `0038_*` onward.
- **Seat checks pass but UI shows wrong count** — `assertSeatAvailable` treats
  `polar_subscriptions.seats == null` as a floor of 1. If a Polar product is
  ever configured without seat-based pricing, every project on it allows at
  most 1 human operator.

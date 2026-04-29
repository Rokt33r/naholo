# Billing

## Overview

Naholo bills per project on Paddle. Each project has one subscription, priced
per active human operator seat (bots are free, so they don't count toward the
seat quantity). The integration runs on two parallel tracks against the same
DB row:

1. **Inline checkout (first checkout only)**. The dedicated subscription page
   mounts Paddle's inline checkout. When the buyer completes payment, the page
   POSTs the resulting `transaction_id` to a one-shot
   `/billing/finalize-checkout` endpoint, which calls Paddle's API and writes
   authoritative subscription state into our DB. This path is gated behind
   `paddleSubscriptionId == null`; once a project has a subscription id, the
   endpoint short-circuits without calling Paddle again.
2. **Webhooks (everything else)**. Renewals, status changes (`past_due`,
   `paused`, `canceled`, `resumed`, `trialing`, `activated`, `created`,
   `imported`, `updated`), and seat-quantity changes flow exclusively through
   `/api/webhooks/paddle`. The handler verifies the Paddle signature, then
   maps the event into the same DB write path as finalize-checkout via
   `buildSubscriptionUpdates`.

Both tracks converge on the same shape via `buildSubscriptionUpdates`. Last
write wins, and both sources read authoritative values from Paddle, so a race
between the inline finalize call and a near-simultaneous webhook is harmless.

## Flow diagram

```
                                BROWSER
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  1. User clicks "Create Project"                                     │
│     └─> create-project-dialog                                        │
│         └─> createProjectAction()  ──────────┐                       │
│                                              │                       │
│  2. router.push(/app/projects/[slug]) <──────┘                       │
│                                                                      │
│  3. ProjectSubscriptionWall sees status=incomplete                   │
│     ├─ admin     → renders <Link href="/subscription">               │
│     └─ non-admin → renders "Ask a project admin" copy (dead-end)     │
│                                                                      │
│  4. User clicks → /app/projects/[slug]/subscription                  │
│                                                                      │
│  5. SubscriptionPage mounts                                          │
│     ├─ initializePaddle()                                            │
│     ├─ <div class="paddle-checkout-frame" />                         │
│     └─ paddle.Checkout.open({                                        │
│          items: [{ priceId, quantity:1 }],                           │
│          customData: { projectId },                                  │
│          settings: { displayMode:'inline',                           │
│                      frameTarget:'paddle-checkout-frame' } })        │
│                                                                      │
│              ┌────────────────────────────────────┐                  │
│              │  Paddle inline iframe              │                  │
│              │  card / address / pay              │                  │
│              └────────────────────────────────────┘                  │
│                          │                                           │
│                          │ user submits payment                      │
│                          ▼                                           │
│  6. Paddle creates Transaction (server-side, async)                  │
│                                                                      │
│  7. paddle.js fires CHECKOUT_COMPLETED                               │
│     └─> event.data.transaction.id  → transactionId                   │
│                                                                      │
│  8. POST /api/projects/[slug]/billing/finalize-checkout              │
│        body: { transactionId }                                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                                BACKEND
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  9. requireAdminProjectOperator(slug)   (non-admin → 500/Forbidden)  │
│                                                                      │
│ 10. finalizeCheckoutFromTransaction({ projectId, transactionId })    │
│     │                                                                │
│     ├─ getProjectSubscription(projectId)                             │
│     │      └─ existing.paddleSubscriptionId != null?                 │
│     │           └─ YES ─► return ok(existing) IMMEDIATELY            │
│     │                     (no Paddle API call — one-shot guard,      │
│     │                      blocks replay/retry abuse)                │
│     │                                                                │
│     ├─ paddle.transactions.get(transactionId)                        │
│     │      └─ tx.subscriptionId? ──── null ─► return 409             │
│     │                              │              (client retries)   │
│     │                              ▼                                 │
│     │                        subscriptionId                          │
│     │                                                                │
│     ├─ verify tx.customData.projectId === projectId                  │
│     │      (security: prevents binding someone else's tx)            │
│     │                                                                │
│     ├─ paddle.subscriptions.get(subscriptionId)                      │
│     │      └─ status, items[0].quantity, billing period,             │
│     │         trialDates, customerId, scheduledChange                │
│     │                                                                │
│     └─ buildSubscriptionUpdates(normalized) → DB UPDATE              │
│        WHERE projectId = ?                                           │
│                                                                      │
│ 11. return ProjectSubscriptionView (status now 'trialing'/'active')  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                                BROWSER
┌──────────────────────────────────────────────────────────────────────┐
│ 12. queryClient.invalidateQueries(['project-subscription', slug])    │
│ 13. SubscriptionPage shows "Subscription started" success            │
│ 14. ProjectSubscriptionWall sees status=trialing → passes through    │
└──────────────────────────────────────────────────────────────────────┘


PARALLEL TRACK (independent, idempotent):

  Paddle ──webhook── POST /api/webhooks/paddle
                          ├─ verify signature (PADDLE_WEBHOOK_SECRET)
                          └─ upsertFromPaddleEvent(event)
                              └─ buildSubscriptionUpdates(...) → DB

  Same DB write path. Either signal can win — last write applies the
  same authoritative state.

ONGOING (after first checkout):

  renewal / cancel / pause / past_due / seat changes
       └─> Paddle fires webhook → upsertFromPaddleEvent
       └─> /billing/finalize-checkout is NEVER called again
```

## Components

| Component                  | Path                                                                                                                                                | Role                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Server SDK singleton       | [src/server/billing/paddle.ts](../src/server/billing/paddle.ts)                                                                                     | Builds the `Paddle` node-SDK client and exports `verifyPaddleSignature`. Throws if no API key     |
| Browser SDK loader         | [src/lib/billing/paddle-browser.ts](../src/lib/billing/paddle-browser.ts)                                                                           | Lazy `initializePaddle()` + `subscribePaddleEvents()` listener bus                                |
| Inline checkout page       | [src/app/app/projects/\[projectSlug\]/subscription/page.tsx](../src/app/app/projects/[projectSlug]/subscription/page.tsx)                           | The only place we mount Paddle. Admin-gated. Renders inline frame + posts on `CHECKOUT_COMPLETED` |
| Finalize-checkout endpoint | [src/app/api/projects/\[projectSlug\]/billing/finalize-checkout/route.ts](../src/app/api/projects/[projectSlug]/billing/finalize-checkout/route.ts) | One-shot per project. Idempotent on `paddleSubscriptionId`. 409 → client retries with backoff     |
| Webhook endpoint           | [src/app/api/webhooks/paddle/route.ts](../src/app/api/webhooks/paddle/route.ts)                                                                     | Ongoing state. Verifies signature, dispatches into `upsertFromPaddleEvent`                        |
| Subscription service       | [src/server/services/project-subscription.ts](../src/server/services/project-subscription.ts)                                                       | `buildSubscriptionUpdates`, `finalizeCheckoutFromTransaction`, `upsertFromPaddleEvent`            |
| Subscription wall          | [src/components/billing/project-subscription-wall.tsx](../src/components/billing/project-subscription-wall.tsx)                                     | Admin-gated. Bypasses on `/subscription` for admins                                               |
| Billing tab                | [src/components/settings/billing-tab.tsx](../src/components/settings/billing-tab.tsx)                                                               | Status readout + Link to `/subscription` page                                                     |

## Environment variables

| Variable                          | Scope            | Purpose                                                                                                |
| --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------ |
| `PADDLE_API_KEY`                  | Server           | Paddle node SDK auth for `transactions.get`, `subscriptions.get`, and (deferred) customer-portal calls |
| `PADDLE_WEBHOOK_SECRET`           | Server           | Notification key used to verify webhook signatures via `Webhooks().unmarshal`                          |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Browser (public) | Token consumed by `initializePaddle()` to bootstrap Paddle.js                                          |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT`  | Browser (public) | `'sandbox' \| 'production'`. Selects which Paddle environment Paddle.js connects to                    |
| `NEXT_PUBLIC_PADDLE_PRICE_ID`     | Browser (public) | The single per-seat recurring price id the inline checkout opens with (`quantity: 1` by default)       |

Sandbox values come from a sandbox Paddle account; production values from the
live account. Don't mix — the API key, webhook secret, client token, and
price id must all belong to the same environment.

## Issuing a Paddle API key

1. Sign into the appropriate Paddle environment (sandbox vs production).
2. Navigate to **Developer tools → Authentication → API keys**.
3. Click **New API key**, name it something like `naholo-prod-server`.
4. Grant the following scopes:
   - `transaction:read` — required. `finalizeCheckoutFromTransaction` calls
     `paddle.transactions.get(transactionId)` to resolve the subscription id
     and verify `customData.projectId`.
   - `subscription:read` — required. After resolving the subscription id, we
     fetch authoritative subscription state via
     `paddle.subscriptions.get(subscriptionId)`.
   - `subscription:write` — recommended for forward compatibility (planned
     in-app cancel / seat-change flows).
   - `customer:read` and `customer:write` — required by the (currently
     deferred) customer-portal session API
     (`paddleServerClient.customers.createPortalSession`).
5. Copy the generated key into the server's `PADDLE_API_KEY` env var.
6. Deploy.

**Rotation**: issue a fresh key with the same scopes, update the env var,
deploy, then revoke the old key in the dashboard. Never overwrite an existing
key in place — keep both alive briefly so a deploy mid-rotation doesn't 401.

## Configuring the webhook destination

1. Go to **Developer tools → Notifications** in the Paddle dashboard.
2. Click **New destination** → type **Webhook** → URL:
   `https://{prod-host}/api/webhooks/paddle`.
3. Subscribe to exactly the events consumed by `upsertFromPaddleEvent` (see
   [src/app/api/webhooks/paddle/route.ts](../src/app/api/webhooks/paddle/route.ts)):
   - `subscription.activated`
   - `subscription.canceled`
   - `subscription.created`
   - `subscription.imported`
   - `subscription.past_due`
   - `subscription.paused`
   - `subscription.resumed`
   - `subscription.trialing`
   - `subscription.updated`
4. Other events (e.g., `transaction.completed`) are safe to subscribe to but
   are ignored by the handler today — they fall through the `default` branch.
5. Copy the destination's **Notification secret** into
   `PADDLE_WEBHOOK_SECRET`. Verification happens via
   `new Webhooks().unmarshal(rawBody, secret, signature)` — a stale secret
   produces a 401 on every event.

**Rotation**: regenerate the secret in the Paddle dashboard, update the env
var, redeploy. Paddle will sign new requests with the new secret immediately,
so deploy promptly.

## Local development

- Set `NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox` and use sandbox-issued values
  for `PADDLE_API_KEY`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, and
  `NEXT_PUBLIC_PADDLE_PRICE_ID`.
- The inline checkout works against `localhost` directly — no tunnel needed
  for the buy-flow itself.
- Webhooks need a publicly reachable URL. Spin up a tunnel
  (`cloudflared tunnel run`, `ngrok http 3000`, etc.), register the tunnel
  URL as a sandbox webhook destination, and set `PADDLE_WEBHOOK_SECRET` to
  the destination's secret. Sandbox secrets are independent of production —
  rotating one doesn't affect the other.

## Deferred / out of scope

- **Customer portal**: `paddleServerClient.customers.createPortalSession` is
  available but not yet exposed in UI. The active branch of the subscription
  page and the billing tab still tell users to use the Paddle email link.
- **Multi-seat checkout**: the inline checkout opens with `quantity: 1`. Seat
  upgrades happen via webhook `subscription.updated` after the customer
  changes the quantity in Paddle. In-app seat editing is deferred.

## Troubleshooting

- **User finishes inline checkout but the subscription stays `incomplete`**.
  Check the finalize-checkout server logs. A burst of 409s means Paddle
  hadn't created the subscription yet — the client backs off and retries up
  to ~10s, and the webhook will eventually upsert via `subscription.created`.
  The 3s `incomplete` poll on the subscription view picks that up.
- **Webhook returning 401**. The `PADDLE_WEBHOOK_SECRET` doesn't match the
  destination Paddle is signing with. Common causes: sandbox secret in a
  prod env, stale secret after rotation, or the secret was copied with
  whitespace.
- **Inline checkout doesn't render**. Confirm
  `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is set and that the page's mount div
  carries the `paddle-checkout-frame` class — Paddle queries by class, not
  id, and a missing class produces a silent no-op.
- **`PADDLE_API_KEY is not set` on boot**. The server SDK singleton throws if
  the env var is missing. The webhook route also throws if the secret is
  missing. Both are intentional — Paddle credentials are required for the
  app to function.

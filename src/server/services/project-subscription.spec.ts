import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest'
import { Pool, PoolClient } from 'pg'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'

vi.mock('server-only', () => ({}))

let testDb: NodePgDatabase<typeof schema>

vi.mock('../db', () => ({
  get db() {
    return testDb
  },
}))

import {
  applyPaddleSubscriptionToProject,
  assertSeatAvailable,
  countActiveHumanOperators,
  resolveProjectSubscription,
  isActiveSubscriptionStatus,
  upsertFromPaddleEvent,
  type PaddleWebhookEvent,
} from './project-subscription'
import { SeatLimitExceededError, SubscriptionNotReadyError } from '../errors'
import type { Subscription } from '@paddle/paddle-node-sdk'

let pool: Pool
let client: PoolClient

async function seedUser() {
  const [user] = await testDb
    .insert(schema.users)
    .values({ name: 'Test User' })
    .returning({ id: schema.users.id })
  return user.id
}

async function seedProject() {
  const [project] = await testDb
    .insert(schema.projects)
    .values({
      name: 'Test Project',
      slug: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })
    .returning({ id: schema.projects.id })
  return project.id
}

async function seedHumanOperator(projectId: string, userId: string) {
  const [operator] = await testDb
    .insert(schema.projectOperators)
    .values({
      projectId,
      userId,
      type: 'user',
      name: 'Human Op',
    })
    .returning({ id: schema.projectOperators.id })
  return operator.id
}

async function seedBotOperator(projectId: string) {
  const [operator] = await testDb
    .insert(schema.projectOperators)
    .values({
      projectId,
      type: 'bot',
      name: 'Bot Op',
    })
    .returning({ id: schema.projectOperators.id })
  return operator.id
}

async function getSubscription(projectId: string) {
  return testDb.query.projectSubscriptions.findFirst({
    where: (t, { eq }) => eq(t.projectId, projectId),
  })
}

async function setSubscriptionStatus(
  projectId: string,
  status: string,
  seatQuantity?: number,
) {
  const updates: Record<string, unknown> = { status }
  if (seatQuantity != null) {
    updates.seatQuantity = seatQuantity
  }
  await testDb
    .update(schema.projectSubscriptions)
    .set(updates)
    .where(eq(schema.projectSubscriptions.projectId, projectId))
}

beforeAll(async () => {
  pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'naholo_test',
    user: process.env.DB_USER ?? 'naholo',
    password: process.env.DB_PASSWORD ?? 'naholo',
  })
})

beforeEach(async () => {
  client = await pool.connect()
  await client.query('BEGIN')
  testDb = drizzle(client, { schema })
})

afterEach(async () => {
  await client.query('ROLLBACK')
  client.release()
})

afterAll(async () => {
  await pool.end()
})

describe('assertSeatAvailable', () => {
  it('returns SubscriptionNotReadyError when status is incomplete', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await resolveProjectSubscription({ projectId, billingUserId: userId })

    const result = await assertSeatAvailable(projectId, userId)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error).toBeInstanceOf(SubscriptionNotReadyError)
  })

  it('returns SeatLimitExceededError when trialing and human count == seatQuantity', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await resolveProjectSubscription({ projectId, billingUserId: userId })
    await setSubscriptionStatus(projectId, 'trialing', 1)
    await seedHumanOperator(projectId, userId)

    const result = await assertSeatAvailable(projectId, userId)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error).toBeInstanceOf(SeatLimitExceededError)
  })

  it('returns Ok when trialing and human count < seatQuantity', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await resolveProjectSubscription({ projectId, billingUserId: userId })
    await setSubscriptionStatus(projectId, 'trialing', 2)
    await seedHumanOperator(projectId, userId)

    const result = await assertSeatAvailable(projectId, userId)

    expect(result.success).toBe(true)
  })

  it('returns Ok when active and seats available', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await resolveProjectSubscription({ projectId, billingUserId: userId })
    await setSubscriptionStatus(projectId, 'active', 3)

    const result = await assertSeatAvailable(projectId, userId)

    expect(result.success).toBe(true)
  })

  it('ignores bot operators when counting seats', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await resolveProjectSubscription({ projectId, billingUserId: userId })
    await setSubscriptionStatus(projectId, 'trialing', 1)
    await seedBotOperator(projectId)
    await seedBotOperator(projectId)

    const result = await assertSeatAvailable(projectId, userId)

    expect(result.success).toBe(true)
  })
})

describe('isActiveSubscriptionStatus', () => {
  it('returns true for active', () => {
    expect(isActiveSubscriptionStatus('active')).toBe(true)
  })

  it('returns true for trialing', () => {
    expect(isActiveSubscriptionStatus('trialing')).toBe(true)
  })

  it('returns false for incomplete, past_due, paused, canceled', () => {
    expect(isActiveSubscriptionStatus('incomplete')).toBe(false)
    expect(isActiveSubscriptionStatus('past_due')).toBe(false)
    expect(isActiveSubscriptionStatus('paused')).toBe(false)
    expect(isActiveSubscriptionStatus('canceled')).toBe(false)
  })
})

describe('countActiveHumanOperators', () => {
  it('counts human operators only, ignoring bots', async () => {
    const userId = await seedUser()
    const otherUserId = await seedUser()
    const projectId = await seedProject()

    await seedHumanOperator(projectId, userId)
    await seedHumanOperator(projectId, otherUserId)
    await seedBotOperator(projectId)
    await seedBotOperator(projectId)

    const total = await countActiveHumanOperators(projectId)
    expect(total).toBe(2)
  })

  it('returns 0 when no operators exist', async () => {
    const projectId = await seedProject()
    const total = await countActiveHumanOperators(projectId)
    expect(total).toBe(0)
  })
})

describe('applyPaddleSubscriptionToProject', () => {
  it('updates the row with normalized paddle data and returns the refreshed subscription', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    const subscription = await resolveProjectSubscription({
      projectId,
      billingUserId: userId,
    })

    const updated = await applyPaddleSubscriptionToProject({
      subscriptionId: subscription.id,
      paddleSubscription: {
        id: 'sub_apply_1',
        customerId: 'cus_apply_1',
        status: 'active',
        items: [{ quantity: 3 }],
        currentBillingPeriod: {
          startsAt: '2026-05-01T00:00:00.000Z',
          endsAt: '2026-06-01T00:00:00.000Z',
        },
      } as unknown as Subscription,
    })

    expect(updated.paddleSubscriptionId).toBe('sub_apply_1')
    expect(updated.paddleCustomerId).toBe('cus_apply_1')
    expect(updated.status).toBe('active')
    expect(updated.seatQuantity).toBe(3)

    const row = await getSubscription(projectId)
    expect(row?.paddleSubscriptionId).toBe('sub_apply_1')
    expect(row?.status).toBe('active')
  })

  it('throws when the subscription row does not exist', async () => {
    await expect(
      applyPaddleSubscriptionToProject({
        subscriptionId: '00000000-0000-0000-0000-000000000000',
        paddleSubscription: {
          id: 'sub_missing',
          status: 'active',
          items: [{ quantity: 1 }],
        } as unknown as Subscription,
      }),
    ).rejects.toThrow('row vanished after update')
  })
})

describe('upsertFromPaddleEvent', () => {
  it('transitions incomplete -> trialing on subscription.created via customData.subscriptionId', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    const subscription = await resolveProjectSubscription({
      projectId,
      billingUserId: userId,
    })

    const event: PaddleWebhookEvent = {
      eventType: 'subscription.created',
      data: {
        id: 'sub_123',
        customerId: 'cus_123',
        status: 'trialing',
        items: [{ quantity: 1 }],
        customData: { projectId, subscriptionId: subscription.id },
      },
    }

    await upsertFromPaddleEvent(event)

    const row = await getSubscription(projectId)
    expect(row?.status).toBe('trialing')
    expect(row?.paddleSubscriptionId).toBe('sub_123')
    expect(row?.paddleCustomerId).toBe('cus_123')
  })

  it('transitions trialing -> active on subscription.updated', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await resolveProjectSubscription({ projectId, billingUserId: userId })
    await testDb
      .update(schema.projectSubscriptions)
      .set({ status: 'trialing', paddleSubscriptionId: 'sub_456' })
      .where(eq(schema.projectSubscriptions.projectId, projectId))

    const event: PaddleWebhookEvent = {
      eventType: 'subscription.updated',
      data: {
        id: 'sub_456',
        status: 'active',
        items: [{ quantity: 1 }],
      },
    }

    await upsertFromPaddleEvent(event)

    const row = await getSubscription(projectId)
    expect(row?.status).toBe('active')
  })

  it('updates seatQuantity from subscription.updated', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await resolveProjectSubscription({ projectId, billingUserId: userId })
    await testDb
      .update(schema.projectSubscriptions)
      .set({
        status: 'active',
        paddleSubscriptionId: 'sub_789',
        seatQuantity: 1,
      })
      .where(eq(schema.projectSubscriptions.projectId, projectId))

    const event: PaddleWebhookEvent = {
      eventType: 'subscription.updated',
      data: {
        id: 'sub_789',
        status: 'active',
        items: [{ quantity: 5 }],
      },
    }

    await upsertFromPaddleEvent(event)

    const row = await getSubscription(projectId)
    expect(row?.seatQuantity).toBe(5)
  })

  it('is idempotent — second subscription.created with same paddle id does not error', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    const subscription = await resolveProjectSubscription({
      projectId,
      billingUserId: userId,
    })

    const event: PaddleWebhookEvent = {
      eventType: 'subscription.created',
      data: {
        id: 'sub_dup',
        customerId: 'cus_dup',
        status: 'trialing',
        items: [{ quantity: 1 }],
        customData: { projectId, subscriptionId: subscription.id },
      },
    }

    await upsertFromPaddleEvent(event)
    await upsertFromPaddleEvent(event)

    const row = await getSubscription(projectId)
    expect(row?.paddleSubscriptionId).toBe('sub_dup')
    expect(row?.status).toBe('trialing')
  })
})

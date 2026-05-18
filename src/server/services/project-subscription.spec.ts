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
  assertSeatAvailable,
  countActiveOperators,
  getActiveProjectSubscription,
  isActiveSubscriptionStatus,
} from './project-subscription'
import { SeatLimitExceededError, SubscriptionNotReadyError } from '../errors'

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
      name: 'Human Op',
    })
    .returning({ id: schema.projectOperators.id })
  return operator.id
}

async function seedActiveSubscription(input: {
  projectId: string
  status: string
  seats: number | null
}) {
  const polarSubId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const [polar] = await testDb
    .insert(schema.polarSubscriptions)
    .values({
      polarSubscriptionId: polarSubId,
      polarCustomerId: `cus_${polarSubId}`,
      billingEmail: 'billing@example.com',
      status: input.status,
      seats: input.seats,
    })
    .returning({ id: schema.polarSubscriptions.id })

  const [link] = await testDb
    .insert(schema.projectSubscriptions)
    .values({
      projectId: input.projectId,
      polarSubscriptionId: polar.id,
    })
    .returning({ id: schema.projectSubscriptions.id })

  await testDb
    .update(schema.projects)
    .set({ activeProjectSubscriptionId: link.id })
    .where(eq(schema.projects.id, input.projectId))

  return { polarId: polar.id, linkId: link.id }
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

describe('getActiveProjectSubscription', () => {
  it('returns null when project has no active subscription', async () => {
    const projectId = await seedProject()
    const result = await getActiveProjectSubscription(projectId)
    expect(result).toBeNull()
  })

  it('returns the joined active subscription when present', async () => {
    const projectId = await seedProject()
    await seedActiveSubscription({
      projectId,
      status: 'active',
      seats: 3,
    })

    const result = await getActiveProjectSubscription(projectId)
    expect(result).not.toBeNull()
    expect(result?.projectId).toBe(projectId)
    expect(result?.polarSubscription?.status).toBe('active')
    expect(result?.polarSubscription?.seats).toBe(3)
    expect(result?.polarSubscription?.billingEmail).toBe('billing@example.com')
  })
})

describe('assertSeatAvailable', () => {
  it('returns SubscriptionNotReadyError when no active subscription', async () => {
    const projectId = await seedProject()
    const result = await assertSeatAvailable(projectId)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error).toBeInstanceOf(SubscriptionNotReadyError)
  })

  it('returns SubscriptionNotReadyError when status is incomplete', async () => {
    const projectId = await seedProject()
    await seedActiveSubscription({
      projectId,
      status: 'incomplete',
      seats: 1,
    })

    const result = await assertSeatAvailable(projectId)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error).toBeInstanceOf(SubscriptionNotReadyError)
  })

  it('returns SeatLimitExceededError when human count >= seatQuantity', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await seedActiveSubscription({
      projectId,
      status: 'trialing',
      seats: 1,
    })
    await seedHumanOperator(projectId, userId)

    const result = await assertSeatAvailable(projectId)

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }
    expect(result.error).toBeInstanceOf(SeatLimitExceededError)
  })

  it('returns Ok when trialing and seats available', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    await seedActiveSubscription({
      projectId,
      status: 'trialing',
      seats: 2,
    })
    await seedHumanOperator(projectId, userId)

    const result = await assertSeatAvailable(projectId)

    expect(result.success).toBe(true)
  })

  it('returns Ok when active and seats available', async () => {
    const projectId = await seedProject()
    await seedActiveSubscription({
      projectId,
      status: 'active',
      seats: 3,
    })

    const result = await assertSeatAvailable(projectId)

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

describe('countActiveOperators', () => {
  it('counts every operator in the project', async () => {
    const userId = await seedUser()
    const otherUserId = await seedUser()
    const projectId = await seedProject()

    await seedHumanOperator(projectId, userId)
    await seedHumanOperator(projectId, otherUserId)

    const total = await countActiveOperators(projectId)
    expect(total).toBe(2)
  })

  it('returns 0 when no operators exist', async () => {
    const projectId = await seedProject()
    const total = await countActiveOperators(projectId)
    expect(total).toBe(0)
  })
})

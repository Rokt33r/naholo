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
import * as schema from '../db/schema'

vi.mock('server-only', () => ({}))

let testDb: NodePgDatabase<typeof schema>

vi.mock('../db', () => ({
  get db() {
    return testDb
  },
}))

let mockUserId: string | null = null
const mockHeaders = new Headers()

vi.mock('next/headers', () => ({
  headers: async () => mockHeaders,
}))

vi.mock('./auth', () => ({
  auth: {
    verifySession: async () =>
      mockUserId == null
        ? { success: false }
        : { success: true, data: { userId: mockUserId } },
    storage: {
      getUserById: async (id: string) => ({ id, name: 'Mock User' }),
    },
  },
}))

import { requireProjectOperator } from './permissions'
import { SubscriptionInactiveError, NotFoundError } from '../services/errors'
import { createIncompleteSubscription } from '../services/project-subscription'

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
    .returning({ id: schema.projects.id, slug: schema.projects.slug })
  return project
}

async function seedOperator(projectId: string, userId: string) {
  const [operator] = await testDb
    .insert(schema.projectOperators)
    .values({
      projectId,
      userId,
      type: 'user',
      name: 'Op',
      role: 'admin',
    })
    .returning({ id: schema.projectOperators.id })
  return operator.id
}

async function setStatus(projectId: string, status: string) {
  await testDb
    .update(schema.projectSubscriptions)
    .set({ status })
    .where(eq(schema.projectSubscriptions.projectId, projectId))
}

import { eq } from 'drizzle-orm'

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
  mockUserId = null
  mockHeaders.delete('authorization')
  mockHeaders.delete('x-naholo-project-operator')
})

afterEach(async () => {
  await client.query('ROLLBACK')
  client.release()
})

afterAll(async () => {
  await pool.end()
})

describe('requireProjectOperator subscription gate', () => {
  it('resolves with subscription.status when active', async () => {
    const userId = await seedUser()
    const project = await seedProject()
    await seedOperator(project.id, userId)
    await createIncompleteSubscription({
      projectId: project.id,
      billingUserId: userId,
    })
    await setStatus(project.id, 'active')
    mockUserId = userId

    const ctx = await requireProjectOperator(project.slug)

    expect(ctx.subscription?.status).toBe('active')
    expect(ctx.project.slug).toBe(project.slug)
  })

  it('resolves when trialing', async () => {
    const userId = await seedUser()
    const project = await seedProject()
    await seedOperator(project.id, userId)
    await createIncompleteSubscription({
      projectId: project.id,
      billingUserId: userId,
    })
    await setStatus(project.id, 'trialing')
    mockUserId = userId

    const ctx = await requireProjectOperator(project.slug)

    expect(ctx.subscription?.status).toBe('trialing')
  })

  it('throws SubscriptionInactiveError on past_due', async () => {
    const userId = await seedUser()
    const project = await seedProject()
    await seedOperator(project.id, userId)
    await createIncompleteSubscription({
      projectId: project.id,
      billingUserId: userId,
    })
    await setStatus(project.id, 'past_due')
    mockUserId = userId

    await expect(requireProjectOperator(project.slug)).rejects.toBeInstanceOf(
      SubscriptionInactiveError,
    )
  })

  it('throws SubscriptionInactiveError on canceled', async () => {
    const userId = await seedUser()
    const project = await seedProject()
    await seedOperator(project.id, userId)
    await createIncompleteSubscription({
      projectId: project.id,
      billingUserId: userId,
    })
    await setStatus(project.id, 'canceled')
    mockUserId = userId

    await expect(requireProjectOperator(project.slug)).rejects.toBeInstanceOf(
      SubscriptionInactiveError,
    )
  })

  it('throws SubscriptionInactiveError with status="missing" when no row exists', async () => {
    const userId = await seedUser()
    const project = await seedProject()
    await seedOperator(project.id, userId)
    mockUserId = userId

    try {
      await requireProjectOperator(project.slug)
      expect.fail('expected throw')
    } catch (error) {
      expect(error).toBeInstanceOf(SubscriptionInactiveError)
      expect((error as SubscriptionInactiveError).status).toBe('missing')
      expect((error as SubscriptionInactiveError).projectSlug).toBe(
        project.slug,
      )
    }
  })

  it('skipSubscriptionCheck=true resolves regardless of status', async () => {
    const userId = await seedUser()
    const project = await seedProject()
    await seedOperator(project.id, userId)
    await createIncompleteSubscription({
      projectId: project.id,
      billingUserId: userId,
    })
    await setStatus(project.id, 'canceled')
    mockUserId = userId

    const ctx = await requireProjectOperator(project.slug, {
      skipSubscriptionCheck: true,
    })

    expect(ctx.subscription?.status).toBe('canceled')
  })

  it('skipSubscriptionCheck=true returns null subscription when no row exists', async () => {
    const userId = await seedUser()
    const project = await seedProject()
    await seedOperator(project.id, userId)
    mockUserId = userId

    const ctx = await requireProjectOperator(project.slug, {
      skipSubscriptionCheck: true,
    })

    expect(ctx.subscription).toBeNull()
  })

  it('throws NotFoundError for unknown project slug', async () => {
    mockUserId = null
    await expect(
      requireProjectOperator('does-not-exist'),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

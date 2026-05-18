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

import { claimPolarProjectSubscriptionFromEvent } from './polar-project-subscription'
import type { PolarSubscriptionRow } from './polar-subscription'

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

async function seedPolarSubscription(): Promise<PolarSubscriptionRow> {
  const polarSubId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const [row] = await testDb
    .insert(schema.polarSubscriptions)
    .values({
      polarSubscriptionId: polarSubId,
      polarCustomerId: `cus_${polarSubId}`,
      billingEmail: 'billing@example.com',
      status: 'active',
      seats: 1,
    })
    .returning()
  return row
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

describe('claimPolarProjectSubscriptionFromEvent', () => {
  it('inserts a project_subscriptions row on first claim', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    const operatorId = await seedHumanOperator(projectId, userId)
    const polarRow = await seedPolarSubscription()

    const result = await claimPolarProjectSubscriptionFromEvent({
      polarSubscriptionRow: polarRow,
      metadata: { projectId, projectOperatorId: operatorId },
    })

    expect(result.claimed).toBe(true)
    if (!result.claimed) {
      return
    }

    const link = await testDb.query.projectSubscriptions.findFirst({
      where: (t, { eq }) => eq(t.id, result.projectSubscriptionId),
    })
    expect(link).not.toBeNull()
    expect(link?.projectId).toBe(projectId)
    expect(link?.polarSubscriptionId).toBe(polarRow.id)

    const project = await testDb.query.projects.findFirst({
      where: (t, { eq }) => eq(t.id, projectId),
    })
    expect(project?.activeProjectSubscriptionId).toBe(
      result.projectSubscriptionId,
    )
  })

  it('reuses the existing row on resubscribe-after-cancel (updates polarSubscriptionId in place)', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    const operatorId = await seedHumanOperator(projectId, userId)
    const firstPolar = await seedPolarSubscription()

    const first = await claimPolarProjectSubscriptionFromEvent({
      polarSubscriptionRow: firstPolar,
      metadata: { projectId, projectOperatorId: operatorId },
    })
    expect(first.claimed).toBe(true)
    if (!first.claimed) {
      return
    }

    const secondPolar = await seedPolarSubscription()
    const second = await claimPolarProjectSubscriptionFromEvent({
      polarSubscriptionRow: secondPolar,
      metadata: { projectId, projectOperatorId: operatorId },
    })

    expect(second.claimed).toBe(true)
    if (!second.claimed) {
      return
    }
    expect(second.projectSubscriptionId).toBe(first.projectSubscriptionId)

    const rows = await testDb
      .select()
      .from(schema.projectSubscriptions)
      .where(eq(schema.projectSubscriptions.projectId, projectId))
    expect(rows).toHaveLength(1)
    expect(rows[0].polarSubscriptionId).toBe(secondPolar.id)

    const project = await testDb.query.projects.findFirst({
      where: (t, { eq }) => eq(t.id, projectId),
    })
    expect(project?.activeProjectSubscriptionId).toBe(
      first.projectSubscriptionId,
    )
  })

  it('skips with no-metadata when metadata is null', async () => {
    const polarRow = await seedPolarSubscription()
    const result = await claimPolarProjectSubscriptionFromEvent({
      polarSubscriptionRow: polarRow,
      metadata: null,
    })
    expect(result.claimed).toBe(false)
    if (result.claimed) {
      return
    }
    expect(result.reason).toBe('no-metadata')
  })

  it('skips with malformed when projectId is not a uuid', async () => {
    const polarRow = await seedPolarSubscription()
    const result = await claimPolarProjectSubscriptionFromEvent({
      polarSubscriptionRow: polarRow,
      metadata: {
        projectId: 'not-a-uuid',
        projectOperatorId: '00000000-0000-0000-0000-000000000000',
      },
    })
    expect(result.claimed).toBe(false)
    if (result.claimed) {
      return
    }
    expect(result.reason).toBe('malformed')
  })

  it('skips with unknown-project when projectId does not exist', async () => {
    const polarRow = await seedPolarSubscription()
    const result = await claimPolarProjectSubscriptionFromEvent({
      polarSubscriptionRow: polarRow,
      metadata: {
        projectId: '00000000-0000-0000-0000-000000000000',
        projectOperatorId: '00000000-0000-0000-0000-000000000000',
      },
    })
    expect(result.claimed).toBe(false)
    if (result.claimed) {
      return
    }
    expect(result.reason).toBe('unknown-project')
  })
})

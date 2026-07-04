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

// Mock server-only (throws in non-server env)
vi.mock('server-only', () => ({}))

// Swap db export to point at our transaction-scoped instance
let testDb: NodePgDatabase<typeof schema>

vi.mock('../db', () => ({
  get db() {
    return testDb
  },
}))

import { syncTasks } from './task'

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
      slug: `test-${Date.now()}`,
    })
    .returning({ id: schema.projects.id })
  return project.id
}

async function seedOperator(projectId: string, userId: string) {
  const [operator] = await testDb
    .insert(schema.projectOperators)
    .values({
      projectId,
      userId,
      name: 'Test Operator',
      callsign: 'test.operator',
    })
    .returning({ id: schema.projectOperators.id })
  return operator.id
}

async function seedOperation(projectId: string) {
  const [operation] = await testDb
    .insert(schema.operations)
    .values({
      projectId,
      number: 1,
      title: 'Test Operation',
    })
    .returning({
      id: schema.operations.id,
      updatedAt: schema.operations.updatedAt,
    })
  return operation
}

async function seedTask(data: {
  projectId: string
  operationId: string
  projectOperatorId: string
  name: string
  position: number
  done?: boolean
  parentTaskId?: string | null
}) {
  const [task] = await testDb
    .insert(schema.operationTasks)
    .values({
      projectId: data.projectId,
      operationId: data.operationId,
      projectOperatorId: data.projectOperatorId,
      name: data.name,
      position: data.position,
      done: data.done ?? false,
      parentTaskId: data.parentTaskId ?? null,
    })
    .returning({ id: schema.operationTasks.id })
  return task.id
}

async function seedBase() {
  const userId = await seedUser()
  const projectId = await seedProject()
  const projectOperatorId = await seedOperator(projectId, userId)
  const operation = await seedOperation(projectId)
  return { projectId, projectOperatorId, operationId: operation.id }
}

async function queryTasks(operationId: string) {
  return testDb.query.operationTasks.findMany({
    columns: {
      id: true,
      name: true,
      done: true,
      position: true,
      parentTaskId: true,
    },
    where: (t, { eq }) => eq(t.operationId, operationId),
    orderBy: (t, { asc }) => [asc(t.parentTaskId), asc(t.position)],
  })
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

describe('syncTasks', () => {
  it('creates all tasks when no existing tasks', async () => {
    const { projectId, projectOperatorId, operationId } = await seedBase()

    const result = await syncTasks({
      projectOperatorId,
      projectId,
      operationId,
      tasks: [{ name: 'Task A' }, { name: 'Task B', done: true }],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data.created).toHaveLength(2)
    expect(result.data.created[0].name).toBe('Task A')
    expect(result.data.created[1].name).toBe('Task B')

    const rows = await queryTasks(operationId)
    expect(rows).toHaveLength(2)

    const objA = rows.find((r) => r.name === 'Task A')!
    expect(objA.position).toBe(0)
    expect(objA.done).toBe(false)
    expect(objA.parentTaskId).toBeNull()

    const objB = rows.find((r) => r.name === 'Task B')!
    expect(objB.position).toBe(1)
    expect(objB.done).toBe(true)
  })

  it('updates existing tasks without creating new ones', async () => {
    const base = await seedBase()
    const e1 = await seedTask({ ...base, name: 'Old A', position: 0 })
    const e2 = await seedTask({ ...base, name: 'Old B', position: 1 })

    const result = await syncTasks({
      ...base,
      tasks: [
        { id: e1, name: 'New A' },
        { id: e2, name: 'New B', done: true },
      ],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.data.created).toHaveLength(0)

    const rows = await queryTasks(base.operationId)
    expect(rows.find((r) => r.id === e1)!.name).toBe('New A')
    expect(rows.find((r) => r.id === e2)!.name).toBe('New B')
    expect(rows.find((r) => r.id === e2)!.done).toBe(true)
  })

  it('deletes specified tasks', async () => {
    const base = await seedBase()
    const keep = await seedTask({ ...base, name: 'Keep', position: 0 })
    const del = await seedTask({
      ...base,
      name: 'Delete Me',
      position: 1,
    })

    const result = await syncTasks({
      ...base,
      tasks: [{ id: keep, name: 'Keep' }],
      taskIdsToDelete: [del],
    })

    expect(result.success).toBe(true)
    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(keep)
  })

  it('handles empty taskIdsToDelete', async () => {
    const base = await seedBase()

    const result = await syncTasks({
      ...base,
      tasks: [{ name: 'Solo' }],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Solo')
  })

  it('preserves orphans by prepending to root', async () => {
    const base = await seedBase()
    const orphan1 = await seedTask({
      ...base,
      name: 'Orphan A',
      position: 0,
    })
    const orphan2 = await seedTask({
      ...base,
      name: 'Orphan B',
      position: 1,
    })
    const referenced = await seedTask({
      ...base,
      name: 'Referenced',
      position: 2,
    })

    const result = await syncTasks({
      ...base,
      tasks: [{ id: referenced, name: 'Referenced' }],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)

    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(3)

    const ref = rows.find((r) => r.id === referenced)!
    const oA = rows.find((r) => r.id === orphan1)!
    const oB = rows.find((r) => r.id === orphan2)!

    expect(oA.position).toBe(0)
    expect(oB.position).toBe(1)
    expect(ref.position).toBe(2)
  })

  it('creates nested tasks with correct parent references', async () => {
    const base = await seedBase()

    const result = await syncTasks({
      ...base,
      tasks: [
        {
          name: 'Parent',
          childTasks: [{ name: 'Child 1' }, { name: 'Child 2' }],
        },
      ],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.data.created).toHaveLength(3)

    const rows = await queryTasks(base.operationId)
    const parent = rows.find((r) => r.name === 'Parent')!
    const child1 = rows.find((r) => r.name === 'Child 1')!
    const child2 = rows.find((r) => r.name === 'Child 2')!

    expect(parent.parentTaskId).toBeNull()
    expect(parent.position).toBe(0)
    expect(child1.parentTaskId).toBe(parent.id)
    expect(child1.position).toBe(0)
    expect(child2.parentTaskId).toBe(parent.id)
    expect(child2.position).toBe(1)
  })

  it('handles mixed existing and new tasks with nesting', async () => {
    const base = await seedBase()
    const existingId = await seedTask({
      ...base,
      name: 'Existing Parent',
      position: 0,
    })

    const result = await syncTasks({
      ...base,
      tasks: [
        {
          id: existingId,
          name: 'Existing Parent',
          childTasks: [{ name: 'New Child' }],
        },
      ],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.data.created).toHaveLength(1)
    expect(result.data.created[0].name).toBe('New Child')

    const rows = await queryTasks(base.operationId)
    const child = rows.find((r) => r.name === 'New Child')!
    expect(child.parentTaskId).toBe(existingId)
  })

  it('treats invalid IDs as new tasks', async () => {
    const base = await seedBase()
    const realId = await seedTask({
      ...base,
      name: 'Real',
      position: 0,
    })

    const result = await syncTasks({
      ...base,
      tasks: [
        { id: realId, name: 'Real' },
        { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Ghost' },
      ],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.data.created).toHaveLength(1)
    expect(result.data.created[0].name).toBe('Ghost')

    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === realId)).toBeDefined()

    const ghost = rows.find((r) => r.name === 'Ghost')!
    expect(ghost.id).not.toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
  })

  it('handles empty task tree', async () => {
    const base = await seedBase()

    const result = await syncTasks({
      ...base,
      tasks: [],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.data.created).toHaveLength(0)

    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(0)
  })

  it('preserves orphans when input tree is empty', async () => {
    const base = await seedBase()
    const orphanId = await seedTask({
      ...base,
      name: 'Orphan',
      position: 0,
    })

    const result = await syncTasks({
      ...base,
      tasks: [],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(orphanId)
  })

  it('preserves orphan hierarchy (child stays under parent orphan)', async () => {
    const base = await seedBase()
    const orphanParent = await seedTask({
      ...base,
      name: 'Orphan Parent',
      position: 0,
    })
    await seedTask({
      ...base,
      name: 'Orphan Child',
      position: 0,
      parentTaskId: orphanParent,
    })

    const result = await syncTasks({
      ...base,
      tasks: [{ name: 'New Task' }],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(3)

    const orphanChild = rows.find((r) => r.name === 'Orphan Child')!
    expect(orphanChild.parentTaskId).toBe(orphanParent)
  })

  it('touches operation updatedAt', async () => {
    const userId = await seedUser()
    const projectId = await seedProject()
    const projectOperatorId = await seedOperator(projectId, userId)
    const operation = await seedOperation(projectId)

    await new Promise((resolve) => setTimeout(resolve, 10))

    await syncTasks({
      projectOperatorId,
      projectId,
      operationId: operation.id,
      tasks: [{ name: 'Task' }],
      taskIdsToDelete: [],
    })

    const [after] = await testDb
      .select({ updatedAt: schema.operations.updatedAt })
      .from(schema.operations)
      .where(eq(schema.operations.id, operation.id))

    expect(after.updatedAt.getTime()).toBeGreaterThan(
      operation.updatedAt.getTime(),
    )
  })

  it('handles deeply nested tasks (4 levels)', async () => {
    const base = await seedBase()

    const result = await syncTasks({
      ...base,
      tasks: [
        {
          name: 'L0',
          childTasks: [
            {
              name: 'L1',
              childTasks: [
                {
                  name: 'L2',
                  childTasks: [{ name: 'L3' }],
                },
              ],
            },
          ],
        },
      ],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.data.created).toHaveLength(4)

    const rows = await queryTasks(base.operationId)
    const l0 = rows.find((r) => r.name === 'L0')!
    const l1 = rows.find((r) => r.name === 'L1')!
    const l2 = rows.find((r) => r.name === 'L2')!
    const l3 = rows.find((r) => r.name === 'L3')!

    expect(l0.parentTaskId).toBeNull()
    expect(l1.parentTaskId).toBe(l0.id)
    expect(l2.parentTaskId).toBe(l1.id)
    expect(l3.parentTaskId).toBe(l2.id)
  })

  it('handles delete + create + update in one call', async () => {
    const base = await seedBase()
    const existingId = await seedTask({
      ...base,
      name: 'Existing',
      position: 0,
    })
    const toDeleteId = await seedTask({
      ...base,
      name: 'To Delete',
      position: 1,
    })

    const result = await syncTasks({
      ...base,
      tasks: [{ id: existingId, name: 'Updated' }, { name: 'Brand New' }],
      taskIdsToDelete: [toDeleteId],
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(result.data.created).toHaveLength(1)
    expect(result.data.created[0].name).toBe('Brand New')

    const rows = await queryTasks(base.operationId)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === toDeleteId)).toBeUndefined()
    expect(rows.find((r) => r.id === existingId)!.name).toBe('Updated')
    expect(rows.find((r) => r.name === 'Brand New')).toBeDefined()
  })
})

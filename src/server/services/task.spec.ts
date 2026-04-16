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

async function seedProject(userId: string) {
  const [project] = await testDb
    .insert(schema.projects)
    .values({
      userId,
      name: 'Test Project',
      slug: `test-${Date.now()}`,
    })
    .returning({ id: schema.projects.id })
  return project.id
}

async function seedWorker(projectId: string, userId: string) {
  const [worker] = await testDb
    .insert(schema.projectWorkers)
    .values({
      projectId,
      userId,
      name: 'Test Worker',
    })
    .returning({ id: schema.projectWorkers.id })
  return worker.id
}

async function seedIssue(projectId: string) {
  const [issue] = await testDb
    .insert(schema.issues)
    .values({
      projectId,
      number: 1,
      title: 'Test Issue',
    })
    .returning({ id: schema.issues.id, updatedAt: schema.issues.updatedAt })
  return issue
}

async function seedTask(data: {
  projectId: string
  issueId: string
  projectWorkerId: string
  name: string
  position: number
  done?: boolean
  parentTaskId?: string | null
}) {
  const [task] = await testDb
    .insert(schema.tasks)
    .values({
      projectId: data.projectId,
      issueId: data.issueId,
      projectWorkerId: data.projectWorkerId,
      name: data.name,
      position: data.position,
      done: data.done ?? false,
      parentTaskId: data.parentTaskId ?? null,
    })
    .returning({ id: schema.tasks.id })
  return task.id
}

async function seedBase() {
  const userId = await seedUser()
  const projectId = await seedProject(userId)
  const projectWorkerId = await seedWorker(projectId, userId)
  const issue = await seedIssue(projectId)
  return { projectId, projectWorkerId, issueId: issue.id }
}

async function queryTasks(issueId: string) {
  return testDb.query.tasks.findMany({
    columns: {
      id: true,
      name: true,
      done: true,
      position: true,
      parentTaskId: true,
    },
    where: (t, { eq }) => eq(t.issueId, issueId),
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
    const { projectId, projectWorkerId, issueId } = await seedBase()

    const result = await syncTasks({
      projectWorkerId,
      projectId,
      issueId,
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

    const rows = await queryTasks(issueId)
    expect(rows).toHaveLength(2)

    const taskA = rows.find((r) => r.name === 'Task A')!
    expect(taskA.position).toBe(0)
    expect(taskA.done).toBe(false)
    expect(taskA.parentTaskId).toBeNull()

    const taskB = rows.find((r) => r.name === 'Task B')!
    expect(taskB.position).toBe(1)
    expect(taskB.done).toBe(true)
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

    const rows = await queryTasks(base.issueId)
    expect(rows.find((r) => r.id === e1)!.name).toBe('New A')
    expect(rows.find((r) => r.id === e2)!.name).toBe('New B')
    expect(rows.find((r) => r.id === e2)!.done).toBe(true)
  })

  it('deletes specified tasks', async () => {
    const base = await seedBase()
    const keep = await seedTask({ ...base, name: 'Keep', position: 0 })
    const del = await seedTask({ ...base, name: 'Delete Me', position: 1 })

    const result = await syncTasks({
      ...base,
      tasks: [{ id: keep, name: 'Keep' }],
      taskIdsToDelete: [del],
    })

    expect(result.success).toBe(true)
    const rows = await queryTasks(base.issueId)
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
    const rows = await queryTasks(base.issueId)
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Solo')
  })

  it('preserves orphans by prepending to root', async () => {
    const base = await seedBase()
    const orphan1 = await seedTask({ ...base, name: 'Orphan A', position: 0 })
    const orphan2 = await seedTask({ ...base, name: 'Orphan B', position: 1 })
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

    const rows = await queryTasks(base.issueId)
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

    const rows = await queryTasks(base.issueId)
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

    const rows = await queryTasks(base.issueId)
    const child = rows.find((r) => r.name === 'New Child')!
    expect(child.parentTaskId).toBe(existingId)
  })

  it('treats invalid IDs as new tasks', async () => {
    const base = await seedBase()
    const realId = await seedTask({ ...base, name: 'Real', position: 0 })

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

    const rows = await queryTasks(base.issueId)
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

    const rows = await queryTasks(base.issueId)
    expect(rows).toHaveLength(0)
  })

  it('preserves orphans when input tree is empty', async () => {
    const base = await seedBase()
    const orphanId = await seedTask({ ...base, name: 'Orphan', position: 0 })

    const result = await syncTasks({
      ...base,
      tasks: [],
      taskIdsToDelete: [],
    })

    expect(result.success).toBe(true)
    const rows = await queryTasks(base.issueId)
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
    const rows = await queryTasks(base.issueId)
    expect(rows).toHaveLength(3)

    const orphanChild = rows.find((r) => r.name === 'Orphan Child')!
    expect(orphanChild.parentTaskId).toBe(orphanParent)
  })

  it('touches issue updatedAt', async () => {
    const userId = await seedUser()
    const projectId = await seedProject(userId)
    const projectWorkerId = await seedWorker(projectId, userId)
    const issue = await seedIssue(projectId)

    await new Promise((resolve) => setTimeout(resolve, 10))

    await syncTasks({
      projectWorkerId,
      projectId,
      issueId: issue.id,
      tasks: [{ name: 'Task' }],
      taskIdsToDelete: [],
    })

    const [after] = await testDb
      .select({ updatedAt: schema.issues.updatedAt })
      .from(schema.issues)
      .where(eq(schema.issues.id, issue.id))

    expect(after.updatedAt.getTime()).toBeGreaterThan(issue.updatedAt.getTime())
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

    const rows = await queryTasks(base.issueId)
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

    const rows = await queryTasks(base.issueId)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.id === toDeleteId)).toBeUndefined()
    expect(rows.find((r) => r.id === existingId)!.name).toBe('Updated')
    expect(rows.find((r) => r.name === 'Brand New')).toBeDefined()
  })
})

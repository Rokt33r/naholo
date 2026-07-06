import 'server-only'
import { db } from '../db'

export type User = {
  id: string
  name: string
  identifiers: { type: string; value: string }[]
  isAdmin: boolean
  createdAt: Date
}

export async function listAllUsers(): Promise<User[]> {
  const rows = await db.query.users.findMany({
    with: {
      identifiers: {
        columns: { type: true, value: true },
      },
    },
    orderBy: (t, { asc }) => asc(t.createdAt),
  })

  const admins = await db.query.adminUsers.findMany()
  const adminSet = new Set(admins.map((a) => a.userId))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    identifiers: row.identifiers,
    isAdmin: adminSet.has(row.id),
    createdAt: row.createdAt,
  }))
}

export type ProjectOperator = {
  projectId: string
  projectName: string
  projectSlug: string
  role: string
}

export type UserDetail = {
  id: string
  name: string
  identifiers: { type: string; value: string }[]
  projectOperators: ProjectOperator[]
  createdAt: Date
}

export async function getUserDetail(
  userId: string,
): Promise<UserDetail | null> {
  const user = await db.query.users.findFirst({
    with: {
      identifiers: { columns: { type: true, value: true } },
      projectOperators: {
        columns: { role: true },
        with: {
          project: { columns: { id: true, name: true, slug: true } },
        },
        orderBy: (t, { asc }) => asc(t.createdAt),
      },
    },
    where: (t, { eq }) => eq(t.id, userId),
  })
  if (user == null) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    identifiers: user.identifiers,
    projectOperators: user.projectOperators.map((operator) => ({
      projectId: operator.project.id,
      projectName: operator.project.name,
      projectSlug: operator.project.slug,
      role: operator.role,
    })),
    createdAt: user.createdAt,
  }
}

import 'server-only'
import { db } from '../db'
import { adminUsers } from '../db/schema'

export type AdminUser = {
  id: string
  name: string
  identifiers: { type: string; value: string }[]
  isAdmin: boolean
  createdAt: Date
}

export async function listAllUsers(): Promise<AdminUser[]> {
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

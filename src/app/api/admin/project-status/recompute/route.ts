import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAppAdmin } from '@/server/auth/permissions'
import { db } from '@/server/db'
import { projects as projectsTable, projectOperators } from '@/server/db/schema'
import { deriveProjectStatus } from '@/server/services/project-status'

export async function POST() {
  await requireAppAdmin()

  const projects = await db.query.projects.findMany({
    columns: { id: true },
    with: {
      activeProjectSubscription: {
        with: {
          polarSubscription: { columns: { status: true, seats: true } },
        },
      },
    },
  })

  const start = Date.now()
  let active = 0
  let trial = 0
  let inactive = 0
  let seatsExceeded = 0

  for (const project of projects) {
    const polarSubscription =
      project.activeProjectSubscription?.polarSubscription ?? null
    const usedSeats = await db.$count(
      projectOperators,
      eq(projectOperators.projectId, project.id),
    )
    const trialRow = await db.query.projectTrials.findFirst({
      columns: { expiresAt: true },
      where: (t, { eq }) => eq(t.projectId, project.id),
      orderBy: (t, { desc }) => desc(t.createdAt),
    })

    const { status, trialUntil } = deriveProjectStatus({
      polarStatus: polarSubscription?.status ?? null,
      seats: polarSubscription?.seats ?? null,
      usedSeats,
      trial: trialRow ?? null,
    })

    await db
      .update(projectsTable)
      .set({ status, trialUntil, updatedAt: new Date() })
      .where(eq(projectsTable.id, project.id))

    if (status === 'active') {
      active++
    } else if (status === 'trial') {
      trial++
    } else if (status === 'inactive') {
      inactive++
    } else if (status === 'seats-exceeded') {
      seatsExceeded++
    }
  }

  const durationMs = Date.now() - start

  return NextResponse.json({
    scanned: projects.length,
    active,
    trial,
    inactive,
    seatsExceeded,
    durationMs,
  })
}

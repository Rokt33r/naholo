import { NextResponse } from 'next/server'
import { requireAppAdmin } from '@/server/auth/permissions'
import { db } from '@/server/db'
import { recomputeProjectStatus } from '@/server/services/project-status'

export async function POST() {
  await requireAppAdmin()

  const projects = await db.query.projects.findMany({
    columns: { id: true },
  })

  const start = Date.now()
  let free = 0
  let active = 0
  let suspended = 0
  let seatsExceeded = 0

  for (const project of projects) {
    const status = await recomputeProjectStatus(project.id)

    if (status === 'free') {
      free++
    } else if (status === 'active') {
      active++
    } else if (status === 'suspended') {
      suspended++
    } else if (status === 'seats-exceeded') {
      seatsExceeded++
    }
  }

  const durationMs = Date.now() - start

  return NextResponse.json({
    scanned: projects.length,
    free,
    active,
    suspended,
    seatsExceeded,
    durationMs,
  })
}

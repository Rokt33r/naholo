import { NextRequest, NextResponse } from 'next/server'
import { ConflictError, mapApiError } from '@/server/errors'
import { requireAdminProjectOperator } from '@/server/auth/permissions'
import { claimProjectTrial } from '@/server/services/project-trial'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project, projectOperator } = await requireAdminProjectOperator(
      projectSlug,
      { skipSubscriptionCheck: true },
    )

    if (project.status === 'active') {
      throw new ConflictError({
        code: 'project_already_active',
        message: 'This project already has an active subscription.',
      })
    }

    const { expiresAt } = await claimProjectTrial({
      userId: projectOperator.userId,
      projectId: project.id,
    })

    return NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() })
  } catch (error) {
    return mapApiError(error)
  }
}

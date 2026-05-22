import { NextRequest, NextResponse } from 'next/server'
import { mapApiError } from '@/server/errors'
import { requireProjectOperator } from '@/server/auth/permissions'
import {
  countActiveOperators,
  getActiveProjectSubscription,
  type ActiveProjectSubscription,
} from '@/server/services/project-subscription'
import type { ProjectStatus } from '@/server/services/project-status'
import { getProjectTrialForUser } from '@/server/services/project-trial'

export type ActiveProjectSubscriptionResponse = {
  subscription: {
    id: string
    projectId: string
    polarSubscription: {
      id: string
      polarSubscriptionId: string
      polarCustomerId: string
      billingEmail: string
      status: string
      seats: number | null
      currentPeriodStart: string | null
      currentPeriodEnd: string | null
      trialStart: string | null
      trialEnd: string | null
      cancelAtPeriodEnd: boolean
      canceledAt: string | null
      startedAt: string | null
      endsAt: string | null
      endedAt: string | null
    } | null
    createdAt: string
    updatedAt: string
  } | null
  usedSeats: number
  isSeatExhausted: boolean
  projectStatus: ProjectStatus
  currentUserTrialCredit: 'unused' | 'spent'
}

function serializeDates(
  subscription: ActiveProjectSubscription,
): ActiveProjectSubscriptionResponse['subscription'] {
  return {
    id: subscription.id,
    projectId: subscription.projectId,
    polarSubscription:
      subscription.polarSubscription == null
        ? null
        : {
            id: subscription.polarSubscription.id,
            polarSubscriptionId:
              subscription.polarSubscription.polarSubscriptionId,
            polarCustomerId: subscription.polarSubscription.polarCustomerId,
            billingEmail: subscription.polarSubscription.billingEmail,
            status: subscription.polarSubscription.status,
            seats: subscription.polarSubscription.seats,
            currentPeriodStart:
              subscription.polarSubscription.currentPeriodStart?.toISOString() ??
              null,
            currentPeriodEnd:
              subscription.polarSubscription.currentPeriodEnd?.toISOString() ??
              null,
            trialStart:
              subscription.polarSubscription.trialStart?.toISOString() ?? null,
            trialEnd:
              subscription.polarSubscription.trialEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: subscription.polarSubscription.cancelAtPeriodEnd,
            canceledAt:
              subscription.polarSubscription.canceledAt?.toISOString() ?? null,
            startedAt:
              subscription.polarSubscription.startedAt?.toISOString() ?? null,
            endsAt:
              subscription.polarSubscription.endsAt?.toISOString() ?? null,
            endedAt:
              subscription.polarSubscription.endedAt?.toISOString() ?? null,
          },
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectSlug: string }> },
) {
  try {
    const { projectSlug } = await params
    const { project, projectOperator } = await requireProjectOperator(
      projectSlug,
      { skipSubscriptionCheck: true },
    )

    const subscription = await getActiveProjectSubscription(project.id)
    const usedSeats =
      subscription?.usedSeats ?? (await countActiveOperators(project.id))
    const isSeatExhausted = subscription?.isSeatExhausted ?? false

    const userTrial = await getProjectTrialForUser(projectOperator.userId)

    const body: ActiveProjectSubscriptionResponse = {
      subscription: subscription == null ? null : serializeDates(subscription),
      usedSeats,
      isSeatExhausted,
      projectStatus: project.status,
      currentUserTrialCredit: userTrial == null ? 'unused' : 'spent',
    }
    return NextResponse.json(body)
  } catch (error) {
    return mapApiError(error)
  }
}

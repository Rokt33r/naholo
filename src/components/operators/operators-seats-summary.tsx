'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { useActiveProjectSubscription } from '@/hooks/use-active-project-subscription'
import { publicConfig } from '@/lib/publicConfig'

type OperatorsSeatsSummaryProps = {
  projectSlug: string
}

export function OperatorsSeatsSummary({
  projectSlug,
}: OperatorsSeatsSummaryProps) {
  if (!publicConfig.billing) {
    return null
  }

  const { currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'
  const { data } = useActiveProjectSubscription(projectSlug)

  if (data == null) {
    return null
  }

  const seats = data.subscription?.polarSubscription?.seats
  const usedSeats = data.usedSeats

  return (
    <div className='flex items-center justify-between gap-2 text-sm'>
      <span className='text-muted-foreground'>
        Seats:{' '}
        <span className='text-foreground font-medium'>
          {usedSeats} / {seats ?? '—'} used
        </span>
      </span>
      {isAdmin && (
        <Link
          href={`/app/projects/${projectSlug}/settings/subscription`}
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1'
        >
          Manage subscription
          <ArrowRight className='size-4' />
        </Link>
      )}
    </div>
  )
}

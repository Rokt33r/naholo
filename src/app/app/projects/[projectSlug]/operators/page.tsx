'use client'

import { Contact } from 'lucide-react'
import { useProjectContext } from '@/components/app/project-context'
import { SubscriptionPanel } from '@/components/billing/subscription-panel'
import { InviteList } from '@/components/operators/invite-list'
import { OperatorsList } from '@/components/operators/operators-list'
import { publicConfig } from '@/lib/publicConfig'

export default function OperatorsIndexPage() {
  const { projectSlug, projectName, projects, currentOperator } =
    useProjectContext()
  const isAdmin = currentOperator.role === 'admin'

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-8 p-6'>
      <section className='flex flex-col gap-3'>
        <div className='flex items-center gap-2'>
          <Contact className='size-5' />
          <h2 className='text-lg font-semibold'>Operators</h2>
        </div>
        <div className='flex max-h-[28rem] flex-col rounded-lg border'>
          <OperatorsList
            projectSlug={projectSlug}
            projectName={projectName}
            projects={projects}
          />
        </div>
        <InviteList projectSlug={projectSlug} />
      </section>

      {isAdmin && publicConfig.billing && (
        <SubscriptionPanel projectSlug={projectSlug} />
      )}
    </div>
  )
}

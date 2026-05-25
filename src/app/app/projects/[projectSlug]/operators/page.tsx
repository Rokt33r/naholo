'use client'

import { Contact, UserPlus } from 'lucide-react'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useProjectContext } from '@/components/app/project-context'
import { InviteList } from '@/components/operators/invite-list'
import { InviteProjectOperatorDialog } from '@/components/operators/invite-project-operator-dialog'
import { OperatorsList } from '@/components/operators/operators-list'
import { OperatorsSeatsSummary } from '@/components/operators/operators-seats-summary'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-is-mobile'

export default function OperatorsIndexPage() {
  const { projectSlug } = useProjectContext()
  const isMobile = useIsMobile()

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center gap-2 px-2 pt-2 h-10'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <h2 className='flex flex-1 items-center gap-2 px-2 font-semibold'>
          <Contact className='size-5' />
          Operators
        </h2>
      </div>

      <div className='flex-1 overflow-y-auto'>
        <div className='flex w-full max-w-2xl flex-col gap-6 p-4'>
          <OperatorsSeatsSummary projectSlug={projectSlug} />
          <OperatorsList projectSlug={projectSlug} />

          <section className='flex flex-col gap-3'>
            <div className='flex items-center justify-between gap-2'>
              <h3 className='text-sm font-medium'>Invites</h3>
              <InviteProjectOperatorDialog projectSlug={projectSlug}>
                <Button size='sm' variant='ghost' title='Invite user'>
                  <UserPlus className='size-4' /> Invite
                </Button>
              </InviteProjectOperatorDialog>
            </div>
            <InviteList projectSlug={projectSlug} />
          </section>
        </div>
      </div>
    </div>
  )
}

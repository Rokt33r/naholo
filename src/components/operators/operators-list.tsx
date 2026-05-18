'use client'

import { useParams, useRouter } from 'next/navigation'
import { Contact, UserPlus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppModeMenu } from '@/components/app/app-mode-menu'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useOperators } from '@/hooks/use-operators'
import { InviteUserOperatorDialog } from './invite-user-operator-dialog'
import { cn } from '@/lib/utils'
import type { Operator } from '@/hooks/use-operators'
import type { Project } from 'naholo-api/types'

type OperatorsListProps = {
  projectSlug: string
  projectName: string
  projects: Project[]
}

export function OperatorsList({
  projectSlug,
  projectName,
  projects,
}: OperatorsListProps) {
  const router = useRouter()
  const params = useParams()
  const currentOperatorId = params.operatorId as string | undefined
  const isMobile = useIsMobile()
  const { operators, isLoading } = useOperators(projectSlug)

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between gap-2 px-2 pt-2'>
        {isMobile && <AppModeMenu currentProjectSlug={projectSlug} />}
        <h2 className='flex flex-1 items-center gap-2 px-2 font-semibold'>
          <Contact className='size-5' />
          Operators
        </h2>
        <div className='flex items-center gap-1'>
          <InviteUserOperatorDialog projectSlug={projectSlug}>
            <Button size='icon-sm' variant='ghost' title='Invite user'>
              <UserPlus className='h-4 w-4' />
            </Button>
          </InviteUserOperatorDialog>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto px-2'>
        {isLoading ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : operators.length === 0 ? (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            No operators in this project
          </div>
        ) : (
          <div>
            {operators.map((operator) => (
              <OperatorItem
                key={operator.id}
                operator={operator}
                isActive={operator.id === currentOperatorId}
                onClick={() =>
                  router.push(
                    `/app/projects/${projectSlug}/operators/${operator.id}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OperatorItem({
  operator,
  isActive,
  onClick,
}: {
  operator: Operator
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent',
        isActive && 'bg-accent',
      )}
      onClick={onClick}
    >
      <User className='size-4 text-muted-foreground' />
      <div className='flex-1 min-w-0'>
        <div className='truncate text-sm font-medium'>{operator.name}</div>
        <div className='text-xs text-muted-foreground'>{operator.role}</div>
      </div>
    </button>
  )
}

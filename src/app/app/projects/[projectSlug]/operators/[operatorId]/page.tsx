'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useProjectContext } from '@/components/app/project-context'
import { EditOperatorSoulForm } from '@/components/operators/edit-operator-soul-form'
import { OperatorTokens } from '@/components/operators/operator-tokens'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { useOperator } from '@/hooks/use-operators'

export default function OperatorDetailPage() {
  const { projectSlug } = useProjectContext()
  const { operatorId } = useParams<{ operatorId: string }>()
  const router = useRouter()
  const isMobile = useIsMobile()
  const { operator, isLoading } = useOperator(projectSlug, operatorId)

  return (
    <div className='flex h-full flex-col'>
      {isMobile && (
        <div className='flex items-center gap-2 px-4 pt-3 pb-1'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() =>
              router.push(`/app/projects/${projectSlug}/operators`)
            }
          >
            <ArrowLeft className='size-4' />
          </Button>
        </div>
      )}
      <div className='flex-1 overflow-y-auto'>
        {isLoading ? (
          <div className='p-6 text-center text-sm text-muted-foreground'>
            Loading...
          </div>
        ) : operator == null ? (
          <div className='p-6 text-center text-sm text-muted-foreground'>
            Operator not found
          </div>
        ) : (
          <div className='space-y-6 p-6'>
            <div className='flex items-center gap-3'>
              {operator.type === 'bot' ? (
                <Bot className='size-5 text-muted-foreground' />
              ) : (
                <User className='size-5 text-muted-foreground' />
              )}
              <div>
                <h1 className='text-lg font-semibold'>{operator.name}</h1>
                <p className='text-sm text-muted-foreground'>
                  {operator.type} &middot; {operator.role}
                </p>
              </div>
            </div>

            {operator.type === 'bot' && (
              <div className='border-t pt-6'>
                <EditOperatorSoulForm
                  projectSlug={projectSlug}
                  operatorId={operatorId}
                  soul={operator.soul}
                />
              </div>
            )}

            <div className='border-t pt-6'>
              <OperatorTokens
                projectSlug={projectSlug}
                operatorId={operatorId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

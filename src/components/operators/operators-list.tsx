'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { OperatorAvatar } from '@/components/operators/operator-avatar'
import { OperatorsSeatsSummary } from '@/components/operators/operators-seats-summary'
import { useProjectContext } from '@/components/app/project-context'
import { useOperators, useRemoveProjectOperator } from '@/hooks/use-operators'
import type { Operator } from '@/hooks/use-operators'
import { publicConfig } from '@/lib/publicConfig'
import { cn } from '@/lib/utils'

type OperatorsListProps = {
  projectSlug: string
}

export function OperatorsList({ projectSlug }: OperatorsListProps) {
  const { currentOperator } = useProjectContext()
  const isAdmin = currentOperator.role === 'admin'
  const { operators, isLoading } = useOperators(projectSlug)
  const removeOperator = useRemoveProjectOperator(projectSlug)

  const handleRemove = (operator: Operator) => {
    if (
      !confirm(
        `Remove ${operator.name} from this project? They will lose access immediately.`,
      )
    ) {
      return
    }
    removeOperator.mutate(operator.id)
  }

  return (
    <Card>
      {publicConfig.billing && (
        <CardHeader>
          <OperatorsSeatsSummary projectSlug={projectSlug} />
        </CardHeader>
      )}
      <CardContent>
        {isLoading ? (
          <div className='text-muted-foreground py-3 text-center text-sm'>
            Loading...
          </div>
        ) : operators.length === 0 ? (
          <div className='text-muted-foreground py-3 text-center text-sm'>
            No operators in this project
          </div>
        ) : (
          <div className='flex flex-col divide-y'>
            {operators.map((operator) => (
              <OperatorRow
                key={operator.id}
                operator={operator}
                isSelf={operator.id === currentOperator.id}
                canRemove={isAdmin}
                onRemove={() => handleRemove(operator)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function OperatorRow({
  operator,
  isSelf,
  canRemove,
  onRemove,
}: {
  operator: Operator
  isSelf: boolean
  canRemove: boolean
  onRemove: () => void
}) {
  const isRoleAdmin = operator.role === 'admin'

  return (
    <div className='flex w-full items-center gap-3.5 py-3.5 first:pt-0 last:pb-0'>
      <OperatorAvatar name={operator.callsign} className='size-9' />

      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='truncate text-[15px] font-semibold leading-tight tracking-tight'>
            {operator.name}
          </span>
          {isSelf && (
            <span className='shrink-0 rounded-full border bg-muted px-1.5 py-px text-[11px] font-medium text-muted-foreground'>
              you
            </span>
          )}
        </div>
        <div className='flex min-w-0 items-center gap-1.5'>
          <span className='shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground'>
            Callsign
          </span>
          <span className='truncate font-mono text-xs text-muted-foreground'>
            {operator.callsign}
          </span>
        </div>
      </div>

      <Badge
        variant={isRoleAdmin ? 'default' : 'secondary'}
        className={cn(
          'shrink-0 capitalize',
          isRoleAdmin ? 'bg-foreground text-background' : 'border',
        )}
      >
        {operator.role}
      </Badge>

      {canRemove && (
        <Button
          variant='ghost'
          size='icon'
          className='shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
          title='Remove operator'
          onClick={onRemove}
        >
          <Trash2 className='size-4' />
        </Button>
      )}
    </div>
  )
}

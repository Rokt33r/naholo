'use client'

import { Plus, MoreVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ObjectiveActionsProps = {
  isCreating: boolean
  isLoading: boolean
  canIndent: boolean
  canOutdent: boolean
  hasPreviousSibling: boolean
  onAddSubtask: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onIndent: () => void
  onOutdent: () => void
}

export function ObjectiveActions({
  isCreating,
  isLoading,
  canIndent,
  canOutdent,
  hasPreviousSibling,
  onAddSubtask,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
}: ObjectiveActionsProps) {
  return (
    <div className='flex shrink-0 items-center gap-1'>
      {isCreating || isLoading ? (
        <Loader2 className='mx-1 h-4 w-4 animate-spin text-zinc-400' />
      ) : (
        <div className='flex items-center gap-1 opacity-0 group-hover/item:opacity-100'>
          <Button
            variant='ghost'
            size='icon'
            className='h-6 w-6'
            onClick={onAddSubtask}
            tabIndex={-1}
          >
            <Plus className='h-3 w-3' />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                tabIndex={-1}
              >
                <MoreVertical className='h-3 w-3' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                onClick={onMoveUp}
                disabled={!hasPreviousSibling}
              >
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveDown}>
                Move down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onIndent} disabled={!canIndent}>
                Indent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOutdent} disabled={!canOutdent}>
                Outdent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className='text-red-600'>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}

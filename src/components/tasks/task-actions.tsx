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

type TaskActionsProps = {
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

export function TaskActions({
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
}: TaskActionsProps) {
  return (
    <div className='absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1'>
      {isCreating || isLoading ? (
        <Loader2 className='mx-1 size-5 animate-spin text-zinc-400' />
      ) : (
        <div className='flex items-center gap-1 pl-6 opacity-0 group-hover/item:opacity-100'>
          <Button
            variant='ghost'
            size='icon'
            className='size-7'
            onClick={onAddSubtask}
            tabIndex={-1}
          >
            <Plus className='size-5' />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='size-7'
                tabIndex={-1}
              >
                <MoreVertical className='size-5' />
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

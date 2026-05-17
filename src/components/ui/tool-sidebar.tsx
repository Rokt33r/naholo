'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function ToolSidebar({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      className={cn(
        'flex h-full flex-col items-center py-2 px-2 bg-tool-sidebar text-tool-sidebar-foreground gap-2',
        className,
      )}
      {...props}
    />
  )
}

function ToolSidebarButton({
  isActive = false,
  tooltip,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  isActive?: boolean
  tooltip: string
}) {
  return (
    <Tooltip delayDuration={600}>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'flex size-10 items-center justify-center rounded-md transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            isActive && 'bg-accent text-accent-foreground',
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side='right'>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

function ToolSidebarSpacing() {
  return <div className='flex-1' />
}

export { ToolSidebar, ToolSidebarButton, ToolSidebarSpacing }

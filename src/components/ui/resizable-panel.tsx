'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type ResizablePanelProps = {
  children: React.ReactNode
  width: number
  onWidthChange: (width: number) => void
  minWidth?: number
  maxWidth?: number
  side?: 'left' | 'right'
  className?: string
}

export function ResizablePanel({
  children,
  width,
  onWidthChange,
  minWidth = 240,
  maxWidth = 600,
  side = 'right',
  className,
}: ResizablePanelProps) {
  const [isResizing, setIsResizing] = React.useState(false)

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      setIsResizing(true)

      const startX = e.clientX
      const startWidth = width

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta =
          side === 'right'
            ? startX - moveEvent.clientX
            : moveEvent.clientX - startX

        const newWidth = Math.min(
          maxWidth,
          Math.max(minWidth, startWidth + delta),
        )
        onWidthChange(newWidth)
      }

      const handlePointerUp = () => {
        setIsResizing(false)
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
      }

      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
    },
    [width, minWidth, maxWidth, side, onWidthChange],
  )

  return (
    <div
      style={{ width: `${width}px` }}
      className={cn('relative flex-shrink-0', className)}
    >
      <div
        onPointerDown={handlePointerDown}
        className={cn(
          'absolute top-0 bottom-0 z-10 w-1 cursor-col-resize transition-colors',
          'hover:bg-zinc-400 dark:hover:bg-zinc-600',
          isResizing && 'bg-zinc-400 dark:bg-zinc-600',
          side === 'right' ? 'left-0' : 'right-0',
        )}
      />
      <div className='h-full overflow-hidden'>{children}</div>
      {isResizing && <div className='fixed inset-0 z-50 cursor-col-resize' />}
    </div>
  )
}

'use client'

import { type MouseEventHandler, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { deriveLabelColors } from '@/lib/label-color'

export function LabelBadge({
  name,
  color,
  onRemove,
  onClick,
  className,
  size = 'default',
}: {
  name: string
  color: string
  onRemove?: () => void
  onClick?: MouseEventHandler<HTMLSpanElement>
  className?: string
  size?: 'default' | 'sm'
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const theme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light'
  const colors = deriveLabelColors(color, theme)

  return (
    <Badge
      onClick={onClick}
      className={cn(
        size === 'sm' ? 'h-5' : 'h-6',
        'border',
        onClick != null && 'cursor-pointer',
        className,
      )}
      style={{
        backgroundColor: colors.background,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {name}
      {onRemove != null ? (
        <button
          type='button'
          aria-label={`Remove ${name}`}
          onClick={onRemove}
          className='-my-0.5 -mr-2 flex items-center self-stretch rounded-r-full px-1 opacity-70 hover:opacity-100'
        >
          <X className='size-3' />
        </button>
      ) : null}
    </Badge>
  )
}

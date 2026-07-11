'use client'

import { type CSSProperties, type MouseEventHandler, useMemo } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { deriveLabelColorScheme } from '@/lib/label-color'

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
  const scheme = useMemo(() => deriveLabelColorScheme(color), [color])

  return (
    <Badge
      onClick={onClick}
      className={cn(
        size === 'sm' ? 'h-5' : 'h-6',
        'border bg-(--label-bg) text-(--label-text) border-(color:--label-border)',
        'dark:bg-(--label-bg-dark) dark:text-(--label-text-dark) dark:border-(color:--label-border-dark)',
        onClick != null &&
          'cursor-pointer transition-colors hover:border-(color:--label-border-hover)! hover:bg-(--label-bg-hover)! hover:text-(--label-text-hover)! dark:hover:border-(color:--label-border-hover-dark)! dark:hover:bg-(--label-bg-hover-dark)! dark:hover:text-(--label-text-hover-dark)!',
        className,
      )}
      style={
        {
          '--label-bg': scheme.light.background,
          '--label-border': scheme.light.border,
          '--label-text': scheme.light.text,
          '--label-bg-dark': scheme.dark.background,
          '--label-border-dark': scheme.dark.border,
          '--label-text-dark': scheme.dark.text,
          '--label-bg-hover': scheme.lightHighlight.background,
          '--label-border-hover': scheme.lightHighlight.border,
          '--label-text-hover': scheme.lightHighlight.text,
          '--label-bg-hover-dark': scheme.darkHighlight.background,
          '--label-border-hover-dark': scheme.darkHighlight.border,
          '--label-text-hover-dark': scheme.darkHighlight.text,
        } as CSSProperties
      }
    >
      {name}
      {onRemove != null ? (
        <button
          type='button'
          aria-label={`Remove ${name}`}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className='-my-0.5 -mr-2 flex items-center self-stretch rounded-r-full px-1 opacity-70 hover:opacity-100'
        >
          <X className='size-3' />
        </button>
      ) : null}
    </Badge>
  )
}

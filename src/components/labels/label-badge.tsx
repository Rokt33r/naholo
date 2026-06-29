'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { deriveLabelColors } from '@/lib/label-color'

export function LabelBadge({
  name,
  color,
  onRemove,
  className,
}: {
  name: string
  color: string
  onRemove?: () => void
  className?: string
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
      className={cn('border', className)}
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
          className='-mr-0.5 ml-0.5 rounded-full opacity-70 hover:opacity-100'
        >
          <X className='size-3' />
        </button>
      ) : null}
    </Badge>
  )
}

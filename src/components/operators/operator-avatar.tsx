import { type MouseEventHandler } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function OperatorAvatar({
  name,
  className,
  onClick,
  interactive,
}: {
  name: string
  className?: string
  onClick?: MouseEventHandler<HTMLSpanElement>
  interactive?: boolean
}) {
  // The fallback highlights on hover of the nearest `group/avatar-hl` — the
  // avatar itself when clickable, or an interactive ancestor (e.g. the side-panel
  // pill) that marks the group and passes `interactive`.
  const isInteractive = interactive === true || onClick != null

  return (
    <Avatar
      className={cn(
        'size-6',
        onClick != null && 'group/avatar-hl cursor-pointer',
        className,
      )}
      title={name}
      onClick={onClick}
      role={onClick != null ? 'button' : undefined}
      aria-label={onClick != null ? name : undefined}
    >
      <AvatarFallback
        className={cn(
          'text-[10px] transition-colors',
          isInteractive &&
            'group-hover/avatar-hl:bg-accent group-hover/avatar-hl:text-foreground',
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s.-]+/)
    .filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

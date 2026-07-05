import { type MouseEventHandler } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function OperatorAvatar({
  name,
  className,
  onClick,
}: {
  name: string
  className?: string
  onClick?: MouseEventHandler<HTMLSpanElement>
}) {
  return (
    <Avatar
      className={cn('size-6', onClick != null && 'cursor-pointer', className)}
      title={name}
      onClick={onClick}
      role={onClick != null ? 'button' : undefined}
      aria-label={onClick != null ? name : undefined}
    >
      <AvatarFallback className='text-[10px]'>
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

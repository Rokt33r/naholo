import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function OperatorAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <Avatar className={cn('size-6', className)} title={name}>
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

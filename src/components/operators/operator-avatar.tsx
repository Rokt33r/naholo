import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function OperatorAvatar({ name }: { name: string }) {
  return (
    <Avatar className='size-6' title={name}>
      <AvatarFallback className='text-[10px]'>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

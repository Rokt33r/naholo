'use client'

import { useIsMobile } from '@/hooks/use-is-mobile'

export default function IssuesIndexPage() {
  const isMobile = useIsMobile()
  if (isMobile) {
    return null
  }

  return (
    <div className='flex h-full items-center justify-center text-muted-foreground'>
      Create or select an issue to get started
    </div>
  )
}

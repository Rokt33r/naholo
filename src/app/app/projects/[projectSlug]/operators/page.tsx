'use client'

import { useIsMobile } from '@/hooks/use-is-mobile'

export default function OperatorsIndexPage() {
  const isMobile = useIsMobile()
  if (isMobile) {
    return null
  }

  return (
    <div className='flex h-full items-center justify-center text-muted-foreground'>
      Select or create an operator
    </div>
  )
}

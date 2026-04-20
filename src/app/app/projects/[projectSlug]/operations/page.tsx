'use client'

import { useIsMobile } from '@/hooks/use-is-mobile'

export default function OperationsIndexPage() {
  const isMobile = useIsMobile()
  if (isMobile) {
    return null
  }

  return (
    <div className='flex h-full items-center justify-center text-muted-foreground'>
      Create or select an operation to get started
    </div>
  )
}

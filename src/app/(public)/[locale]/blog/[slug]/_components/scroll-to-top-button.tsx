'use client'

import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ScrollToTopButton() {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      aria-label='Scroll to top'
      onClick={handleClick}
      className='fixed bottom-6 z-50 rounded-full shadow-lg'
      style={{ left: 'min(calc(50% + 24rem + 1rem), calc(100% - 3.5rem))' }}
    >
      <ArrowUp className='size-4' />
    </Button>
  )
}

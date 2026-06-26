'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAction } from '@/lib/use-action'
import { logoutAction } from '@/app/app/actions'

export function LogoutButton() {
  const { execute: logout } = useAction(logoutAction)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Button variant='outline' onClick={handleLogout}>
      <LogOut className='size-4' />
      Log out
    </Button>
  )
}

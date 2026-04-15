'use client'

import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAction } from '@/lib/use-action'
import { logoutAction } from '@/app/app/actions'

export function UserSettingsTab() {
  const { execute: logout } = useAction(logoutAction)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>User Settings</h3>
        <p className='text-muted-foreground text-sm'>
          Manage your account preferences.
        </p>
      </div>

      <div>
        <Button variant='outline' onClick={handleLogout}>
          <LogOut className='mr-2 size-4' />
          Log out
        </Button>
      </div>
    </div>
  )
}

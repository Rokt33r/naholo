'use client'

import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAction } from '@/lib/use-action'
import { logoutAction } from '@/app/app/actions'
import { fetcher, createResponseError } from '@/lib/fetcher'

export function UserSettingsTab() {
  const { execute: logout } = useAction(logoutAction)
  const [notificationEmail, setNotificationEmail] = useState('')
  const [savedEmail, setSavedEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetcher<{ email: string | null }>('/api/user/notification-email').then(
      (data) => {
        setNotificationEmail(data.email ?? '')
        setSavedEmail(data.email ?? '')
        setIsLoading(false)
      },
    )
  }, [])

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!notificationEmail.trim()) {
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/user/notification-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notificationEmail.trim() }),
      })
      if (!response.ok) {
        throw await createResponseError(
          response,
          'Failed to update notification email',
        )
      }
      setSavedEmail(notificationEmail.trim())
      toast.success('Notification email updated')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update notification email',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const hasChanges = notificationEmail.trim() !== savedEmail

  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>User Settings</h3>
        <p className='text-muted-foreground text-sm'>
          Manage your account preferences.
        </p>
      </div>

      <form onSubmit={handleSaveEmail} className='space-y-2'>
        <Label htmlFor='notification-email'>Notification Email</Label>
        <div className='flex gap-2'>
          <Input
            id='notification-email'
            type='email'
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder='your@email.com'
            disabled={isLoading || isSaving}
          />
          <Button type='submit' disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className='text-muted-foreground text-xs'>
          Used for project invite notifications and other alerts.
        </p>
      </form>

      <div>
        <Button variant='outline' onClick={handleLogout}>
          <LogOut className='mr-2 size-4' />
          Log out
        </Button>
      </div>
    </div>
  )
}

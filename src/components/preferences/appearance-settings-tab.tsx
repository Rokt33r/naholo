'use client'

import { Label } from '@/components/ui/label'
import { ThemeSwitcher } from '@/components/theme-switcher'

export function AppearanceSettingsTab() {
  return (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold'>Appearance</h3>
        <p className='text-muted-foreground text-sm'>
          Customise how naholo looks.
        </p>
      </div>

      <div className='space-y-2'>
        <Label htmlFor='theme-switcher'>Theme</Label>
        <div className='flex items-center justify-between gap-4'>
          <p className='text-muted-foreground text-sm'>
            Pick System, Dark, or Light.
          </p>
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}

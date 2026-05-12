'use client'

import { useState } from 'react'
import { LandPlot, Contact, Settings, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SettingsDialog } from '@/components/settings/settings-dialog'

type AppModeMenuProps = {
  currentProjectSlug: string
}

export function AppModeMenu({ currentProjectSlug }: AppModeMenuProps) {
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon-sm'>
          <Menu className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/operations`)
          }
        >
          <LandPlot className='mr-2 h-4 w-4' />
          Operations
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/operators`)
          }
        >
          <Contact className='mr-2 h-4 w-4' />
          Operators
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
          <Settings className='mr-2 h-4 w-4' />
          Settings
        </DropdownMenuItem>
      </DropdownMenuContent>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </DropdownMenu>
  )
}

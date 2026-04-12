'use client'

import { ListTodo, HardHat, Puzzle, LogOut, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAction } from '@/lib/use-action'
import { logoutAction } from '@/app/app/actions'

type AppModeMenuProps = {
  currentProjectSlug: string
}

export function AppModeMenu({ currentProjectSlug }: AppModeMenuProps) {
  const router = useRouter()
  const { execute: logout } = useAction(logoutAction)

  const handleLogout = async () => {
    await logout()
  }

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
            router.push(`/app/projects/${currentProjectSlug}/issues`)
          }
        >
          <ListTodo className='mr-2 h-4 w-4' />
          Issues
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/workers`)
          }
        >
          <HardHat className='mr-2 h-4 w-4' />
          Workers
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            router.push(`/app/projects/${currentProjectSlug}/skill-sets`)
          }
        >
          <Puzzle className='mr-2 h-4 w-4' />
          Skills
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className='mr-2 h-4 w-4' />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

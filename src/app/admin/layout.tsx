import { requireAppAdmin } from '@/server/auth/permissions'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AdminSidebar } from './admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAppAdmin()
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className='flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800'>
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

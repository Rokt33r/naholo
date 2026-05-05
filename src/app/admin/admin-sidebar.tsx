'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const items = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/paddle-webhook-events', label: 'Paddle Webhook Events' },
  { href: '/admin/paddle-subscriptions', label: 'Paddle Subscriptions' },
  { href: '/admin/project-subscriptions', label: 'Project Subscriptions' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <Sidebar>
      <SidebarHeader>
        <div className='px-2 py-1 text-sm font-semibold text-sidebar-foreground'>
          Admin
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sections</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>{item.label}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

import { redirect } from 'next/navigation'
import { publicConfig } from '@/lib/publicConfig'

export default function PolarWebhookEventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!publicConfig.billing) {
    redirect('/admin')
  }
  return <>{children}</>
}

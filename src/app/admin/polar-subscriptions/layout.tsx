import { redirect } from 'next/navigation'
import { publicConfig } from '@/lib/publicConfig'

export default function PolarSubscriptionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!publicConfig.billing) {
    redirect('/admin')
  }
  return <>{children}</>
}

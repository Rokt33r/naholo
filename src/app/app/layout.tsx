import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/sign-in')
  }

  return <>{children}</>
}

import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Redirect to home if already authenticated
  const user = await getAuthUser()
  if (user) {
    redirect('/')
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950'>
      {children}
    </div>
  )
}

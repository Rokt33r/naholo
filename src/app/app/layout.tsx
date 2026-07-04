import { requireAuthUser } from '@/server/auth/permissions'
import { SessionRefresh } from '@kenmon/nextjs-adapter'
import { QueryProvider } from '@/components/query-provider'
import { refreshSessionAction } from './actions'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuthUser({
    allowedAuthMethods: ['session'],
    redirectUrlOnFail: '/sign-in',
  })

  return (
    <QueryProvider>
      <SessionRefresh refreshAction={refreshSessionAction} />
      {children}
    </QueryProvider>
  )
}

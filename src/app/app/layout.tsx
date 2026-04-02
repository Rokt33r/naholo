import { requireAuthUser } from '@/server/auth/permissions'
import { SessionRefresh } from '@kenmon/nextjs-adapter'
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
    <>
      <SessionRefresh refreshAction={refreshSessionAction} />
      {children}
    </>
  )
}

import { requireAuthOrRedirect } from '@/server/auth/utils'
import { SessionRefresh } from '@kenmon/nextjs-adapter'
import { refreshSessionAction } from './actions'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuthOrRedirect()

  return (
    <>
      <SessionRefresh refreshAction={refreshSessionAction} />
      {children}
    </>
  )
}

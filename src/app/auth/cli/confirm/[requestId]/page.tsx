import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'
import {
  getCliLoginRequestById,
  isCliLoginRequestPending,
} from '@/server/services/cli-login-request'
import { CliConfirmClient } from './cli-confirm-client'

export default async function CliConfirmPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params

  const user = await getAuthUser()
  if (!user) {
    redirect(`/sign-in?returnTo=/auth/cli/confirm/${requestId}`)
  }

  const loginRequest = await getCliLoginRequestById(requestId)
  if (!loginRequest || !isCliLoginRequestPending(loginRequest)) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-xl font-semibold'>
            Request expired or not found
          </h1>
          <p className='mt-2 text-sm text-gray-500'>
            This login request is no longer valid. Please try again from the
            CLI.
          </p>
        </div>
      </div>
    )
  }

  return <CliConfirmClient requestId={requestId} words={loginRequest.words} />
}

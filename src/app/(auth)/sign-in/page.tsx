import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/utils'
import { validateReturnTo } from '@/lib/validate-return-to'
import { SignInForm } from './sign-in-form'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  const validatedReturnTo = validateReturnTo(returnTo)

  const user = await getAuthUser()
  if (user) {
    redirect(validatedReturnTo || '/')
  }

  return <SignInForm returnTo={validatedReturnTo ?? undefined} />
}

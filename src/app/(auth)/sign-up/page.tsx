import { redirect } from 'next/navigation'
import { getAuthUser } from '@/server/auth/permissions'
import { validateReturnTo } from '@/lib/validate-return-to'
import { SignUpForm } from './sign-up-form'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  const validatedReturnTo = validateReturnTo(returnTo)

  const user = await getAuthUser({
    allowedAuthMethods: ['session'],
  })
  if (user) {
    redirect(validatedReturnTo || '/')
  }

  return <SignUpForm returnTo={validatedReturnTo ?? undefined} />
}

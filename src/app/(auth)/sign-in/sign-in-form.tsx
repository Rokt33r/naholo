'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAction } from '@/lib/use-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  sendOTPAction,
  verifyOTPForSigningInAction,
  initiateGoogleOAuthAction,
} from '../actions'

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [otpId, setOtpId] = useState('')
  const [signature, setSignature] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [error, setError] = useState('')

  const { execute: sendOTP, loading: sendingOTP } = useAction(sendOTPAction)
  const { execute: verifyOTP, loading: verifying } = useAction(
    verifyOTPForSigningInAction,
  )
  const { execute: initiateGoogleOAuth, loading: initiatingGoogleOAuth } =
    useAction(initiateGoogleOAuthAction)

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await sendOTP(email)

    if (!result.success) {
      setError(result.error.message)
      return
    }

    setOtpId(result.data.otpId)
    setSignature(result.data.signature)
    setStep('otp')
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await verifyOTP(email, otpId, code)

    if (!result.success) {
      setError(result.error.message)
      return
    }

    router.push('/')
    router.refresh()
  }

  const handleGoogleSignIn = async () => {
    setError('')

    const result = await initiateGoogleOAuth('sign-in')

    if (!result.success) {
      setError(result.error.message)
      return
    }

    window.location.href = result.data.authUrl
  }

  const loading = sendingOTP || verifying || initiatingGoogleOAuth

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          {step === 'email'
            ? 'Enter your email to receive a verification code'
            : 'Enter the 6-digit code sent to your email'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'email' ? (
          <div className='space-y-4'>
            <form onSubmit={handleSendOTP} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='you@example.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {error && <p className='text-sm text-red-500'>{error}</p>}
              <Button type='submit' className='w-full' disabled={loading}>
                {sendingOTP ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </form>
            <div className='relative'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-white dark:bg-zinc-950 px-2 text-zinc-500'>
                  Or
                </span>
              </div>
            </div>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {initiatingGoogleOAuth
                ? 'Redirecting...'
                : 'Continue with Google'}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleVerifyOTP} className='space-y-4'>
            <div className='space-y-2'>
              <Label>Verification Code</Label>
              <div className='flex justify-center'>
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {signature && (
                <p className='text-xs text-center text-zinc-500 mt-2'>
                  Signature: <span className='font-mono'>{signature}</span>
                </p>
              )}
            </div>
            {error && <p className='text-sm text-red-500'>{error}</p>}
            <div className='space-y-2'>
              <Button
                type='submit'
                className='w-full'
                disabled={loading || code.length !== 6}
              >
                {verifying ? 'Verifying...' : 'Verify Code'}
              </Button>
              <Button
                type='button'
                variant='ghost'
                className='w-full'
                onClick={() => {
                  setStep('email')
                  setCode('')
                  setError('')
                }}
                disabled={loading}
              >
                Back to Email
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className='flex justify-center'>
        <p className='text-sm text-zinc-600 dark:text-zinc-400'>
          Don&apos;t have an account?{' '}
          <Link
            href='/sign-up'
            className='font-medium text-zinc-950 dark:text-zinc-50 hover:underline'
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

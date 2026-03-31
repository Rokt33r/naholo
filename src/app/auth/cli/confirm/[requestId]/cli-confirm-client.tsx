'use client'

import { useState } from 'react'

export function CliConfirmClient({
  requestId,
  words,
}: {
  requestId: string
  words: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/auth/cli/confirm/${requestId}`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to approve')
        return
      }

      const { redirectUrl } = await res.json()
      window.location.href = redirectUrl
    } catch {
      setError('Failed to approve request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='w-full max-w-sm text-center'>
        <h1 className='text-xl font-semibold'>CLI Login Request</h1>
        <p className='mt-2 text-sm text-gray-500'>
          A CLI app is requesting access to your account.
        </p>
        <p className='mt-1 text-sm text-gray-500'>
          Verify that the following words match what the CLI is showing:
        </p>
        <div className='mt-4 rounded-lg bg-gray-100 px-4 py-3 font-mono text-lg dark:bg-gray-800'>
          {words}
        </div>
        {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}
        <button
          onClick={handleApprove}
          disabled={loading}
          className='mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
        >
          {loading ? 'Approving...' : 'Approve'}
        </button>
      </div>
    </div>
  )
}

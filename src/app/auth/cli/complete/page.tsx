export default async function CliCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-xl font-semibold'>Login Failed</h1>
          <p className='mt-2 text-sm text-gray-500'>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-xl font-semibold'>Login Successful!</h1>
        <p className='mt-2 text-sm text-gray-500'>You can close this tab.</p>
      </div>
    </div>
  )
}

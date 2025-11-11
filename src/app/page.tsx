import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getAuthUser } from '@/server/auth/utils'

export default async function HomePage() {
  const user = await getAuthUser()

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950'>
      <div className='mx-auto max-w-2xl px-6 text-center'>
        <h1 className='text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl'>
          Bocchi
        </h1>
        <p className='mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400'>
          A personal note-taking app with a messenger-like interface. Create
          projects, track issues, and manage tasks - all in one place.
        </p>
        <div className='mt-10 flex items-center justify-center gap-x-6'>
          {user ? (
            <Button asChild size='lg'>
              <Link href='/app'>Go to App</Link>
            </Button>
          ) : (
            <>
              <Button asChild size='lg'>
                <Link href='/sign-in'>Sign In</Link>
              </Button>
              <Button asChild variant='outline' size='lg'>
                <Link href='/sign-up'>Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

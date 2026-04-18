import { Github } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import icon from '@/app/icon.png'

// Placeholder — owner will replace with the actual public repo URL once the
// project is open-sourced.
const GITHUB_URL = 'https://github.com/'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950'>
      <header className='border-b border-zinc-200 dark:border-zinc-800'>
        <nav className='mx-auto flex max-w-4xl items-center justify-between px-6 py-4'>
          <Link
            href='/'
            className='flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50'
          >
            <Image src={icon} alt='' width={24} height={24} />
            naholo
          </Link>
          <div className='flex items-center gap-6'>
            <Link
              href='/pricing'
              className='text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Pricing
            </Link>
            <Link
              href='/sign-in'
              className='text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Sign In
            </Link>
          </div>
        </nav>
      </header>

      <main className='flex-1'>{children}</main>

      <footer className='border-t border-zinc-200 dark:border-zinc-800'>
        <div className='mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between'>
          <div className='flex gap-6'>
            <Link
              href='/terms'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              이용약관
            </Link>
            <Link
              href='/privacy'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              개인정보처리방침
            </Link>
            <Link
              href='/refund'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              환불 정책
            </Link>
          </div>
          <div className='flex items-center gap-4'>
            <p className='text-sm text-zinc-400 dark:text-zinc-500'>
              &copy; {new Date().getFullYear()} Junyoung Choi. All rights
              reserved.
            </p>
            <a
              href={GITHUB_URL}
              aria-label='Source repo'
              target='_blank'
              rel='noopener noreferrer'
              className='text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            >
              <Github className='h-4 w-4' />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import icon from '@/app/icon.png'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { LanguageSwitcher } from './_components/language-switcher'
import { PublicNavActions } from './_components/public-nav-actions'

const GITHUB_URL = 'https://github.com/rokt33r/naholo'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950'>
      <header className='border-b border-zinc-200 dark:border-zinc-800'>
        <nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-4'>
          <Link
            href='/'
            className='flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-50'
          >
            <Image src={icon} alt='logo' width={50} height={50} />
            naholo
            <span className='rounded bg-amber-100 px-1 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'>
              Alpha
            </span>
          </Link>
          <div className='flex items-center gap-4 md:gap-6'>
            <a
              href={GITHUB_URL}
              aria-label='Source repo'
              target='_blank'
              rel='noopener noreferrer'
              className='hidden text-sm text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Github
            </a>
            <Link
              href='/field-manual'
              className='hidden text-sm text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Field Manual
            </Link>
            <Link
              href='/patchnotes'
              className='hidden text-sm text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Patchnotes
            </Link>
            <Link
              href='/pricing'
              className='hidden text-sm text-zinc-600 hover:text-zinc-900 md:inline dark:text-zinc-400 dark:hover:text-zinc-50'
            >
              Pricing
            </Link>
            <PublicNavActions githubUrl={GITHUB_URL} />
            <div className='hidden items-center gap-1 md:inline-flex'>
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
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
              Terms
            </Link>
            <Link
              href='/privacy'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              Privacy
            </Link>
            <Link
              href='/refund'
              className='text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
            >
              Refund Policy
            </Link>
          </div>
          <div className='flex items-center gap-4'>
            <p className='text-sm text-zinc-400 dark:text-zinc-500'>
              &copy; {new Date().getFullYear()} Junyoung Choi. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

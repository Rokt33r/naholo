'use client'

import { useMemo, type ReactNode } from 'react'

type LinkifiedTextProps = {
  text: string
  className?: string
}

// URL regex pattern that matches http, https, and www URLs
const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>[\]{}|\\^`"']+(?:\([^\s<>[\]{}|\\^`"']*\)|[^\s<>[\]{}|\\^`"'.,;:!?)\]])/gi

export function LinkifiedText({ text, className }: LinkifiedTextProps) {
  const parts = useMemo(() => {
    const result: ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    // Reset regex state
    URL_REGEX.lastIndex = 0

    while ((match = URL_REGEX.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index))
      }

      // Add the URL as a link
      const url = match[0]
      const href = url.startsWith('www.') ? `https://${url}` : url

      result.push(
        <a
          key={match.index}
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-600 hover:underline dark:text-blue-400'
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>,
      )

      lastIndex = match.index + url.length
    }

    // Add remaining text after the last URL
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex))
    }

    return result
  }, [text])

  return <span className={className}>{parts}</span>
}

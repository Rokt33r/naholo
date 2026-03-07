import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(duration: number) {
  return new Promise((res, rej) => {
    setTimeout(res, duration)
  })
}

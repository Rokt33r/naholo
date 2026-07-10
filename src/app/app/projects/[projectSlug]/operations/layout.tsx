import { OperationsNav } from '@/components/operations/operations-nav'

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='flex h-full w-full'>
      <OperationsNav />
      <div className='flex-1 overflow-hidden'>{children}</div>
    </div>
  )
}

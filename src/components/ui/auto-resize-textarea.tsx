'use client'

import { useEffect, useRef, type ComponentProps } from 'react'

function AutoResizeTextarea({
  ref,
  ...props
}: ComponentProps<'textarea'> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = internalRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [props.value])

  return (
    <textarea
      ref={(node) => {
        internalRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref)
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current =
            node
      }}
      {...props}
    />
  )
}

export { AutoResizeTextarea }

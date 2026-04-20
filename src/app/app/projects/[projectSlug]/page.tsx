'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ProjectPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/app/projects/${projectSlug}/operations`)
  }, [router, projectSlug])

  return null
}

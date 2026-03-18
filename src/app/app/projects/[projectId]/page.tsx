'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/app/projects/${projectId}/issues`)
  }, [router, projectId])

  return null
}

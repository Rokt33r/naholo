export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`

    try {
      const errorData = await res.json()
      errorMessage = errorData.error || errorMessage
    } catch (e) {
      console.error('Failed to parse error response:', {
        url,
        status: res.status,
        parseError: e,
      })
    }

    throw new Error(errorMessage)
  }

  return res.json()
}

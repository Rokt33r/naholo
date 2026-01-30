export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    throw await createResponseError(res)
  }

  return res.json()
}

/**
 * Create an Error from a Response object
 */
export async function createResponseError(
  response: Response,
  fallback?: string,
): Promise<Error> {
  const defaultMessage =
    fallback ?? `HTTP ${response.status}: ${response.statusText}`

  try {
    const data = await response.json()
    return new Error(data.error || defaultMessage)
  } catch (parseError) {
    console.error('Failed to parse error response:', {
      status: response.status,
      parseError,
    })
    return new Error(defaultMessage)
  }
}

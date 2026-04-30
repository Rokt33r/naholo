let clientId: string | null = null

export function getClientId(): string {
  if (clientId == null) {
    clientId = crypto.randomUUID()
  }
  return clientId
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)

  if (!res.ok) {
    throw await createResponseError(res)
  }

  return res.json()
}

/**
 * Fetch wrapper for mutations that includes the X-Client-Id header
 * for self-event filtering in realtime updates.
 */
export function mutationFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('X-Client-Id', getClientId())
  return fetch(url, { ...init, headers })
}

export class SubscriptionInactiveResponseError extends Error {
  readonly status: string
  readonly projectSlug: string

  constructor(status: string, projectSlug: string) {
    super('Project subscription is inactive.')
    this.name = 'SubscriptionInactiveResponseError'
    this.status = status
    this.projectSlug = projectSlug
  }
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
    if (
      response.status === 402 &&
      data?.error === 'subscription_inactive' &&
      typeof data.status === 'string' &&
      typeof data.projectSlug === 'string'
    ) {
      return new SubscriptionInactiveResponseError(
        data.status,
        data.projectSlug,
      )
    }
    return new Error(data.error || defaultMessage)
  } catch (parseError) {
    console.error('Failed to parse error response:', {
      status: response.status,
      parseError,
    })
    return new Error(defaultMessage)
  }
}

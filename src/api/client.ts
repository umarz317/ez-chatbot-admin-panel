import type {
  AdminMessage,
  AdminConversationThreadResponse,
  AdminConversationsResponse,
  AdminStats,
  AdminTicket,
  AdminTicketsResponse,
  AdminTicketStatus,
} from '../types'
import { API_BASE_URL, API_REQUEST_TIMEOUT_MS } from '../config'

type QueryValue = string | number | null | undefined
type AdminMessageMutationResponse = { message: AdminMessage }
type AdminOtpRequestResponse = {
  challenge_token: string
  email: string
  expires_in: number
  delivery: string
  dev_otp_code?: string
}
type AdminOtpVerifyResponse = {
  access_token: string
  token: string
  token_type: string
  expires_in: number
  admin_email: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return
      }
      url.searchParams.set(key, String(value))
    })
  }
  return url.toString()
}

function combineAbortSignals(...signals: Array<AbortSignal | null | undefined>): AbortSignal | undefined {
  const activeSignals = signals.filter((signal): signal is AbortSignal => Boolean(signal))
  if (activeSignals.length === 0) {
    return undefined
  }
  if (activeSignals.length === 1) {
    return activeSignals[0]
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(activeSignals)
  }

  const controller = new AbortController()
  const abort = () => controller.abort()
  activeSignals.forEach((signal) => {
    if (signal.aborted) {
      abort()
      return
    }
    signal.addEventListener('abort', abort, { once: true })
  })
  return controller.signal
}

async function adminFetch<T>(
  path: string,
  authToken: string,
  query?: Record<string, QueryValue>,
  options?: RequestInit,
  requiresAuth: boolean = true,
): Promise<T> {
  const normalizedToken = authToken.trim()
  if (requiresAuth && !normalizedToken) {
    throw new ApiError('Unauthorized', 401)
  }

  const headers = new Headers(options?.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (requiresAuth) {
    headers.set('Authorization', `Bearer ${normalizedToken}`)
    headers.set('X-Admin-Token', normalizedToken)
  }

  const timeoutController = new AbortController()
  const timeoutId = window.setTimeout(() => timeoutController.abort(), API_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildUrl(path, query), {
      ...options,
      headers,
      signal: combineAbortSignals(options?.signal, timeoutController.signal),
    })

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`
      try {
        const contentType = (response.headers.get('content-type') || '').toLowerCase()
        if (contentType.includes('application/json')) {
          const body = (await response.json()) as { error?: string; message?: string }
          message = body?.error || body?.message || message
        } else {
          const text = (await response.text()).trim()
          if (text) {
            message = text
          }
        }
      } catch {
        // Ignore response body parsing failures.
      }

      if (response.status === 401) {
        throw new ApiError('Unauthorized', response.status)
      }
      throw new ApiError(message, response.status)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${API_REQUEST_TIMEOUT_MS}ms`, 408)
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0)
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function requestAdminOtp(email: string): Promise<AdminOtpRequestResponse> {
  return adminFetch<AdminOtpRequestResponse>(
    '/api/admin/auth/request-otp',
    '',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
    false,
  )
}

export function verifyAdminOtp(
  email: string,
  otp: string,
  challengeToken: string,
): Promise<AdminOtpVerifyResponse> {
  return adminFetch<AdminOtpVerifyResponse>(
    '/api/admin/auth/verify-otp',
    '',
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({
        email,
        otp,
        challenge_token: challengeToken,
      }),
    },
    false,
  )
}

export function fetchAdminStats(apiKey: string): Promise<AdminStats> {
  return adminFetch<AdminStats>('/api/admin/stats', apiKey)
}

export function fetchAdminConversations(
  apiKey: string,
  params: {
    page: number
    limit: number
    q: string
    userEmail: string
    fromDate: string
    toDate: string
  },
): Promise<AdminConversationsResponse> {
  return adminFetch<AdminConversationsResponse>('/api/admin/conversations', apiKey, {
    page: params.page,
    limit: params.limit,
    q: params.q,
    user_email: params.userEmail,
    from: params.fromDate,
    to: params.toDate,
  })
}

export function fetchConversationMessages(
  apiKey: string,
  sessionKey: string,
): Promise<AdminConversationThreadResponse> {
  return adminFetch<AdminConversationThreadResponse>(
    `/api/admin/conversations/${encodeURIComponent(sessionKey)}/messages`,
    apiKey,
  )
}

export function createAdminMessage(
  apiKey: string,
  sessionKey: string,
  content: string,
  sender: string = 'assistant',
): Promise<AdminMessageMutationResponse> {
  return adminFetch<AdminMessageMutationResponse>(
    `/api/admin/conversations/${encodeURIComponent(sessionKey)}/messages`,
    apiKey,
    undefined,
    {
      method: 'POST',
      body: JSON.stringify({ content, sender }),
    }
  )
}

export function editAdminMessage(
  apiKey: string,
  sessionKey: string,
  messageId: number,
  content: string,
): Promise<AdminMessageMutationResponse> {
  return adminFetch<AdminMessageMutationResponse>(
    `/api/admin/conversations/${encodeURIComponent(sessionKey)}/messages/${messageId}`,
    apiKey,
    undefined,
    {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }
  )
}

export function deleteAdminMessage(
  apiKey: string,
  sessionKey: string,
  messageId: number,
): Promise<{ deleted_message_id: number }> {
  return adminFetch<{ deleted_message_id: number }>(
    `/api/admin/conversations/${encodeURIComponent(sessionKey)}/messages/${messageId}`,
    apiKey,
    undefined,
    {
      method: 'DELETE',
    }
  )
}

export function deleteAdminConversation(
  apiKey: string,
  sessionKey: string,
): Promise<{ deleted_session_id: number; deleted_session_key: string }> {
  return adminFetch<{ deleted_session_id: number; deleted_session_key: string }>(
    `/api/admin/conversations/${encodeURIComponent(sessionKey)}`,
    apiKey,
    undefined,
    {
      method: 'DELETE',
    }
  )
}

export function updateAdminConversationTitle(
  apiKey: string,
  sessionKey: string,
  title: string,
): Promise<{ session: { session_id: string; title: string | null } }> {
  return adminFetch<{ session: { session_id: string; title: string | null } }>(
    `/api/admin/conversations/${encodeURIComponent(sessionKey)}`,
    apiKey,
    undefined,
    {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }
  )
}

export function fetchAdminTickets(
  apiKey: string,
  params: {
    page: number
    limit: number
    q: string
    status: 'all' | AdminTicketStatus
  },
): Promise<AdminTicketsResponse> {
  return adminFetch<AdminTicketsResponse>('/api/admin/tickets', apiKey, {
    page: params.page,
    limit: params.limit,
    q: params.q,
    status: params.status,
  })
}

export function fetchAdminTicket(apiKey: string, ticketId: number): Promise<{ ticket: AdminTicket }> {
  return adminFetch<{ ticket: AdminTicket }>(`/api/admin/tickets/${ticketId}`, apiKey)
}

export function updateAdminTicket(
  apiKey: string,
  ticketId: number,
  payload: {
    status?: AdminTicketStatus
    admin_note?: string
  },
): Promise<{ ticket: AdminTicket }> {
  return adminFetch<{ ticket: AdminTicket }>(
    `/api/admin/tickets/${ticketId}`,
    apiKey,
    undefined,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

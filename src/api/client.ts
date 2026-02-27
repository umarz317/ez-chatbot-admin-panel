import type {
  AdminMessage,
  AdminConversationThreadResponse,
  AdminConversationsResponse,
  AdminStats,
} from '../types'
import { API_BASE_URL } from '../config'

type QueryValue = string | number | null | undefined
type AdminMessageMutationResponse = { message: AdminMessage }

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

async function adminFetch<T>(
  path: string,
  apiKey: string,
  query?: Record<string, QueryValue>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Api-Key': apiKey,
      ...(options?.headers || {}),
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = (await response.json()) as { error?: string }
      if (body?.error) {
        message = body.error
      }
    } catch {
      // Ignore JSON parse failures and keep default message.
    }
    throw new Error(message)
  }

  return (await response.json()) as T
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

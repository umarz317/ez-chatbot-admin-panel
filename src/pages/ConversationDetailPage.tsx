import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { fetchConversationMessages, createAdminMessage, editAdminMessage, deleteAdminMessage } from '../api/client'
import type { AdminPresenceState } from '../presence/useAdminPresence'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  PhoneIcon,
  CalendarIcon,
  FingerPrintIcon,
  ClockIcon,
  PaperClipIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  TrashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'

type ConversationDetailPageProps = {
  apiKey: string
  presence: AdminPresenceState
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

function formatShortDate(value: string | null): string {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function displayUserName(email: string | null, name: string | null): string {
  return name || email || 'Unknown user'
}

function initialsFromName(value: string): string {
  const parts = value
    .split(' ')
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return 'U'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function formatLastSeen(value: string | null): string {
  if (!value) {
    return '-'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }
  return parsed.toLocaleString()
}

export function ConversationDetailPage({ apiKey, presence }: ConversationDetailPageProps) {
  const { sessionKey = '' } = useParams<{ sessionKey: string }>()

  const threadQuery = useQuery({
    queryKey: ['admin-conversation-thread', apiKey, sessionKey],
    queryFn: () => fetchConversationMessages(apiKey, sessionKey),
    enabled: Boolean(sessionKey),
  })

  const queryClient = useQueryClient()
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [deleteTargetMessageId, setDeleteTargetMessageId] = useState<number | null>(null)
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null)

  const editMutation = useMutation({
    mutationFn: (params: { messageId: number; content: string }) =>
      editAdminMessage(apiKey, sessionKey, params.messageId, params.content),
    onSuccess: () => {
      setEditingMessageId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-thread', apiKey, sessionKey] })
    },
    onError: (err: Error) => {
      setModalErrorMessage(`Failed to save edit: ${err.message}`)
    }
  })

  const replyMutation = useMutation({
    mutationFn: (content: string) => createAdminMessage(apiKey, sessionKey, content),
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-thread', apiKey, sessionKey] })
    },
    onError: (err: Error) => {
      setModalErrorMessage(`Failed to send message: ${err.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (messageId: number) => deleteAdminMessage(apiKey, sessionKey, messageId),
    onSuccess: () => {
      setDeleteTargetMessageId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-thread', apiKey, sessionKey] })
    },
    onError: (err: Error) => {
      setModalErrorMessage(`Failed to delete message: ${err.message}`)
    }
  })

  const session = threadQuery.data?.session
  const messages = threadQuery.data?.messages || []
  const userName = displayUserName(session?.user?.email ?? null, session?.user?.full_name ?? null)
  const conversationTitle = (session?.title || '').trim() || 'Untitled chat'
  const livePresence = presence.getPresenceForUser(session?.user)
  const isOnline = livePresence?.is_online ?? session?.is_online ?? false
  const lastSeenAt = livePresence?.last_seen_at ?? session?.last_seen_at ?? null

  return (
    <section className="space-y-4 font-poppins">
      <header className="flex flex-col justify-between gap-3 rounded-xl border border-[#E1E3E5] bg-white shadow-sm px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 max-w-full truncate text-xl font-semibold text-[#202223]">{conversationTitle}</h1>
            <span className="rounded-full bg-[#F2F7F5] px-2 py-0.5 text-[11px] font-medium text-[#005B3E]">
              {messages.length} messages
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isOnline ? 'bg-[#E3F1DF] text-[#005B3E]' : 'bg-[#F1F2F3] text-[#6D7175]'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="m-0 mt-1 truncate text-sm text-[#6D7175]">Session: {sessionKey}</p>
        </div>

        <Link
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded border border-[#C9CCCF] bg-white px-4 text-sm font-medium text-[#202223] shadow-sm no-underline transition hover:bg-[#F6F6F7]"
          to="/conversations"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to inbox
        </Link>
      </header>

      {threadQuery.isLoading ? (
        <div className="space-y-2 rounded-xl border border-[#E1E3E5] bg-white shadow-sm p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`loading-${index}`} className="h-3 w-full animate-pulse rounded bg-[#E1E3E5]" />
          ))}
        </div>
      ) : null}

      {threadQuery.isError ? (
        <div className="flex items-start gap-2 rounded border border-[#E4B4B4] bg-[#FFF5F5] px-3 py-2.5 text-sm text-[#8A1F1F]">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{(threadQuery.error as Error).message}</span>
        </div>
      ) : null}

      {threadQuery.data ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-3">
            <article className="rounded-xl border border-[#E1E3E5] bg-white shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E3F1DF] text-sm font-semibold text-[#005B3E]">
                  {initialsFromName(userName)}
                </div>
                <div className="min-w-0">
                  <p className="m-0 truncate text-sm font-semibold text-[#202223]">{userName}</p>
                  <p className="m-0 mt-0.5 truncate text-sm text-[#6D7175]">{session?.user?.email || '-'}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-[#6D7175]">
                    <ClockIcon className="h-3.5 w-3.5" />
                    Last Seen
                  </dt>
                  <dd className="m-0 text-right text-[#202223]">{isOnline ? 'Online now' : formatLastSeen(lastSeenAt)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-[#6D7175]">
                    <PhoneIcon className="h-3.5 w-3.5" />
                    Phone
                  </dt>
                  <dd className="m-0 text-[#202223]">{session?.user?.phone || '-'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-[#6D7175]">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Created
                  </dt>
                  <dd className="m-0 text-right text-[#202223]">{formatShortDate(session?.created_at || null)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-[#6D7175]">
                    <FingerPrintIcon className="h-3.5 w-3.5" />
                    Session ID
                  </dt>
                  <dd className="m-0 max-w-[120px] truncate text-right font-mono text-xs text-[#202223]">
                    {session?.session_id || '-'}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-xl border border-[#E1E3E5] bg-white shadow-sm p-4">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 text-[#6D7175]" />
                <p className="m-0 text-xs font-medium uppercase tracking-wide text-[#6D7175]">Timeline</p>
              </div>
              <p className="m-0 mt-2 text-sm text-[#202223]">Started: {formatDate(session?.created_at || null)}</p>
              <p className="m-0 mt-1 text-sm text-[#202223]">
                Latest: {messages.length ? formatDate(messages[messages.length - 1].created_at) : '-'}
              </p>
            </article>
          </aside>

          <section className="overflow-hidden rounded-xl border border-[#E1E3E5] bg-white shadow-sm">
            <div className="border-b border-[#E1E3E5] bg-[#F6F6F7] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#6D7175]">
              Thread
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C9CCCF] p-8 text-center">
                  <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-[#C9CCCF]" />
                  <p className="m-0 mt-2 text-sm font-medium text-[#202223]">No messages in this conversation yet.</p>
                </div>
              ) : null}

              {messages.map((message) => {
                const isAssistant = message.sender === 'assistant'

                return (
                  <article
                    key={message.id}
                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[85%] rounded-xl border px-3 py-2.5 sm:max-w-[75%] ${isAssistant
                      ? 'border-[#D4ECDD] bg-[#F2F7F5]'
                      : 'border-[#D9DCE0] bg-[#F6F6F7]'
                      }`}>
                      <header className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#4A5560]">
                          {isAssistant ? 'Assistant' : 'Customer'}
                        </span>
                        <div className="flex items-center gap-3">
                          <time className="text-xs text-[#6D7175]">{formatDate(message.created_at)}</time>
                          {isAssistant && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(message.id)
                                setEditContent(message.content)
                              }}
                              className="text-[#6D7175] transition hover:text-[#008060] focus:outline-none"
                              title="Edit message"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTargetMessageId(message.id)}
                            disabled={deleteMutation.isPending}
                            className="text-[#6D7175] transition hover:text-[#D72C0D] focus:outline-none disabled:opacity-50"
                            title="Delete message"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </header>

                      {editingMessageId === message.id ? (
                        <div className="mt-2">
                          <textarea
                            className="w-full resize-none rounded-md border border-[#C9CCCF] bg-white p-2 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                            rows={4}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            disabled={editMutation.isPending}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => editMutation.mutate({ messageId: message.id, content: editContent })}
                              disabled={editMutation.isPending || !editContent.trim()}
                              className="inline-flex h-8 items-center justify-center rounded border border-[#008060] bg-[#008060] px-3 text-xs font-medium text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:bg-[#008060] disabled:opacity-50"
                            >
                              {editMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              disabled={editMutation.isPending}
                              className="inline-flex h-8 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-xs font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="m-0 mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#202223]">
                          {message.content}
                        </p>
                      )}

                      {message.attachments.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-[#C9CCCF] bg-white px-2.5 py-1 text-xs font-medium text-[#202223] no-underline hover:bg-[#F6F6F7]"
                            >
                              <PaperClipIcon className="h-3 w-3 text-[#6D7175]" />
                              {attachment.original_filename || attachment.stored_name || attachment.url}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="border-t border-[#E1E3E5] bg-[#F6F6F7] p-4">
              <div className="relative">
                <textarea
                  className="w-full resize-none rounded-xl border border-[#C9CCCF] bg-white py-3 pl-4 pr-14 text-sm text-[#202223] shadow-sm outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                  rows={3}
                  placeholder="Type a new reply as Assistant..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={replyMutation.isPending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (newMessage.trim() && !replyMutation.isPending) {
                        replyMutation.mutate(newMessage.trim())
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newMessage.trim() && !replyMutation.isPending) {
                      replyMutation.mutate(newMessage.trim())
                    }
                  }}
                  disabled={replyMutation.isPending || !newMessage.trim()}
                  className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#008060] text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:bg-[#008060] disabled:opacity-50"
                  title="Send message"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {deleteTargetMessageId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E3E5] bg-white p-4 shadow-xl">
            <h3 className="m-0 text-base font-semibold text-[#202223]">Delete message?</h3>
            <p className="m-0 mt-2 text-sm text-[#6D7175]">
              This will permanently remove this message from the conversation.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetMessageId(null)}
                disabled={deleteMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTargetMessageId === null || deleteMutation.isPending) return
                  deleteMutation.mutate(deleteTargetMessageId)
                }}
                disabled={deleteMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded border border-[#D72C0D] bg-[#D72C0D] px-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#B0250B] disabled:cursor-not-allowed disabled:bg-[#D72C0D] disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalErrorMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E4B4B4] bg-white p-4 shadow-xl">
            <h3 className="m-0 text-base font-semibold text-[#8A1F1F]">Action failed</h3>
            <p className="m-0 mt-2 text-sm text-[#6D7175]">{modalErrorMessage}</p>
            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setModalErrorMessage(null)}
                className="inline-flex h-9 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { fetchConversationMessages, createAdminMessage, editAdminMessage, deleteAdminMessage, deleteAdminConversation, updateAdminConversationTitle, updateAdminConversationHandoff } from '../api/client'
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
  LifebuoyIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { API_BASE_URL } from '../config'
import type { AdminConversationThreadResponse } from '../types'
import { formatLocalDate, formatLocalDateTime, formatLocalLastSeen } from '../utils/datetime'

type ConversationDetailPageProps = {
  apiKey: string
  presence: AdminPresenceState
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
  const formatted = formatLocalLastSeen(value)
  return formatted === 'Offline' ? '-' : formatted.replace(/^Last seen\s+/, '')
}

function handoffBadgeClass(status: 'bot' | 'pending_agent' | 'agent_active'): string {
  if (status === 'pending_agent') return 'bg-[#FFF1F0] text-[#A0151A]'
  if (status === 'agent_active') return 'bg-[#E8F3FF] text-[#0B5CAD]'
  return 'bg-[#EEF2F6] text-[#4A5560]'
}

function handoffLabel(status: 'bot' | 'pending_agent' | 'agent_active'): string {
  if (status === 'pending_agent') return 'Awaiting agent'
  if (status === 'agent_active') return 'Live agent active'
  return 'Bot mode'
}

function messageOriginLabel(origin: string | null | undefined, sender: string): string {
  const resolved = (origin || '').trim().toLowerCase()
  if (resolved === 'admin') return 'Live agent'
  if (resolved === 'system') return 'System'
  if (resolved === 'bot') return 'Bot'
  if (resolved === 'user' || sender === 'user') return 'Customer'
  return sender === 'assistant' ? 'Assistant' : 'Customer'
}

function resolveAttachmentUrl(value: string | null): string {
  const raw = (value || '').trim()
  if (!raw) {
    return ''
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw
  }
  const base = API_BASE_URL.replace(/\/+$/, '')
  const path = raw.replace(/^\/+/, '')
  return `${base}/${path}`
}

function isImageAttachment(attachment: {
  mime_type: string | null
  original_filename: string | null
  stored_name: string | null
  url: string
}): boolean {
  const mime = (attachment.mime_type || '').toLowerCase()
  if (mime.startsWith('image/')) {
    return true
  }
  const name = (
    attachment.original_filename
    || attachment.stored_name
    || attachment.url
    || ''
  ).toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)$/.test(name)
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function shouldHideAttachmentFilenameCaption(message: {
  content: string
  attachments: Array<{
    original_filename: string | null
    stored_name: string | null
    url: string
  }>
}): boolean {
  if (!message.attachments.length) {
    return false
  }
  const content = normalizeText(message.content)
  if (!content) {
    return true
  }

  const candidates = new Set<string>()
  message.attachments.forEach((attachment) => {
    const original = normalizeText(attachment.original_filename)
    const stored = normalizeText(attachment.stored_name)
    const basename = normalizeText(attachment.url.split('/').pop() || '')
    if (original) candidates.add(original)
    if (stored) candidates.add(stored)
    if (basename) candidates.add(basename)
  })

  return candidates.has(content)
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="mt-2 break-words text-sm leading-relaxed text-[#202223]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({ children }) => <p className="m-0">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href || '#'}
              target="_blank"
              rel="noreferrer"
              className="break-all text-[#006E52] underline"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="m-0 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="m-0 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          code: ({ className, children }) => {
            if (className) {
              return <code className={className}>{children}</code>
            }
            return (
              <code className="rounded bg-[#EEF2F6] px-1 py-0.5 font-mono text-[12px] text-[#202223]">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-[#111827] p-3 text-xs text-[#F9FAFB]">
              {children}
            </pre>
          ),
          strong: ({ children }) => <strong className="font-semibold text-[#202223]">{children}</strong>,
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}

export function ConversationDetailPage({ apiKey, presence }: ConversationDetailPageProps) {
  const { sessionKey = '' } = useParams<{ sessionKey: string }>()
  const navigate = useNavigate()
  const threadContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldAutoScrollRef = useRef(true)

  const threadQuery = useQuery({
    queryKey: ['admin-conversation-thread', apiKey, sessionKey, presence.conversationEventsVersion],
    queryFn: () => fetchConversationMessages(apiKey, sessionKey),
    enabled: Boolean(sessionKey),
    placeholderData: (previousData) => previousData,
  })

  const queryClient = useQueryClient()
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [deleteTargetMessageId, setDeleteTargetMessageId] = useState<number | null>(null)
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false)
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null)

  const scrollThreadToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = threadContainerRef.current
    if (!container) {
      return
    }
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
  }

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
    onSuccess: (result) => {
      setNewMessage('')
      shouldAutoScrollRef.current = true
      queryClient.setQueriesData(
        { queryKey: ['admin-conversation-thread', apiKey, sessionKey] },
        (existing: AdminConversationThreadResponse | undefined) => {
          if (!existing) {
            return existing
          }

          const alreadyPresent = existing.messages.some((message) => message.id === result.message.id)
          if (alreadyPresent) {
            return existing
          }

          return {
            ...existing,
            messages: [...existing.messages, result.message],
          }
        },
      )
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

  const deleteSessionMutation = useMutation({
    mutationFn: () => deleteAdminConversation(apiKey, sessionKey),
    onSuccess: () => {
      setIsDeleteSessionModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['admin-conversations', apiKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats', apiKey] })
      navigate('/conversations')
    },
    onError: (err: Error) => {
      setModalErrorMessage(`Failed to delete session: ${err.message}`)
    }
  })

  const updateTitleMutation = useMutation({
    mutationFn: (title: string) => updateAdminConversationTitle(apiKey, sessionKey, title),
    onSuccess: (data) => {
      setIsEditingTitle(false)
      setTitleDraft((data?.session?.title || '').trim())
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-thread', apiKey, sessionKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-conversations', apiKey] })
    },
    onError: (err: Error) => {
      setModalErrorMessage(`Failed to update title: ${err.message}`)
    }
  })

  const handoffMutation = useMutation({
    mutationFn: (action: 'accept' | 'end') => updateAdminConversationHandoff(apiKey, sessionKey, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-thread', apiKey, sessionKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-conversations', apiKey] })
    },
    onError: (err: Error) => {
      setModalErrorMessage(`Failed to update handoff: ${err.message}`)
    }
  })

  const session = threadQuery.data?.session
  const handoff = session?.handoff
  const messages = threadQuery.data?.messages || []
  const sessionTickets = threadQuery.data?.tickets || []
  const openTicketCount = session?.open_ticket_count || 0
  const userName = displayUserName(session?.user?.email ?? null, session?.user?.full_name ?? null)
  const conversationTitle = (session?.title || '').trim() || 'Untitled chat'
  const livePresence = presence.getPresenceForUser(session?.user)
  const isOnline = livePresence?.is_online ?? session?.is_online ?? false
  const lastSeenAt = livePresence?.last_seen_at ?? session?.last_seen_at ?? null
  const timelineEvents = [
    {
      key: 'started',
      label: 'Started',
      value: formatLocalDateTime(session?.created_at || null),
    },
    {
      key: 'latest',
      label: 'Latest',
      value: messages.length ? formatLocalDateTime(messages[messages.length - 1].created_at) : '-',
    },
    handoff?.requested_at ? {
      key: 'requested',
      label: 'Requested',
      value: formatLocalDateTime(handoff.requested_at),
    } : null,
    handoff?.started_at ? {
      key: 'accepted',
      label: 'Accepted',
      value: formatLocalDateTime(handoff.started_at),
    } : null,
  ].filter(Boolean) as Array<{
    key: string
    label: string
    value: string
  }>

  useEffect(() => {
    setTitleDraft(conversationTitle)
  }, [conversationTitle])

  useEffect(() => {
    shouldAutoScrollRef.current = true
  }, [sessionKey])

  useEffect(() => {
    if (!messages.length || !shouldAutoScrollRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      scrollThreadToBottom(messages.length <= 1 ? 'auto' : 'smooth')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [messages.length, threadQuery.dataUpdatedAt])

  return (
    <section className="space-y-4 font-poppins">
      <header className="flex flex-col justify-between gap-3 rounded-xl border border-[#E1E3E5] bg-white shadow-sm px-4 py-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 max-w-full truncate text-xl font-semibold text-[#202223]">{conversationTitle}</h1>
            <button
              type="button"
              onClick={() => {
                setIsEditingTitle(true)
                setTitleDraft(conversationTitle)
              }}
              disabled={updateTitleMutation.isPending}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[#C9CCCF] bg-white text-[#6D7175] transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              title="Edit title"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
            </button>
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
            {handoff ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${handoffBadgeClass(handoff.status)}`}>
                {handoffLabel(handoff.status)}
              </span>
            ) : null}
            {openTicketCount > 0 ? (
              <span className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-medium text-[#A0151A]">
                {openTicketCount} open ticket{openTicketCount > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
          {isEditingTitle ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                disabled={updateTitleMutation.isPending}
                className="h-9 w-full max-w-sm rounded border border-[#C9CCCF] bg-white px-3 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                placeholder="Conversation title"
                maxLength={120}
              />
              <button
                type="button"
                onClick={() => {
                  const nextTitle = titleDraft.trim()
                  if (!nextTitle || updateTitleMutation.isPending) return
                  updateTitleMutation.mutate(nextTitle)
                }}
                disabled={updateTitleMutation.isPending || !titleDraft.trim()}
                className="inline-flex h-9 items-center justify-center rounded border border-[#008060] bg-[#008060] px-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:bg-[#008060] disabled:opacity-50"
              >
                {updateTitleMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTitle(false)
                  setTitleDraft(conversationTitle)
                }}
                disabled={updateTitleMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <p className="m-0 mt-1 truncate text-sm text-[#6D7175]">Session: {sessionKey}</p>
        </div>

        <div className="flex items-center gap-2">
          {handoff?.status === 'pending_agent' ? (
            <button
              type="button"
              onClick={() => handoffMutation.mutate('accept')}
              disabled={handoffMutation.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded border border-[#0B5CAD] bg-[#0B5CAD] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#084C8D] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserIcon className="h-4 w-4" />
              {handoffMutation.isPending ? 'Accepting...' : 'Accept handoff'}
            </button>
          ) : null}
          {handoff && handoff.status !== 'bot' ? (
            <button
              type="button"
              onClick={() => handoffMutation.mutate('end')}
              disabled={handoffMutation.isPending}
              className="inline-flex h-10 items-center gap-1.5 rounded border border-[#C9CCCF] bg-white px-4 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              {handoffMutation.isPending ? 'Updating...' : 'Return to bot'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsDeleteSessionModalOpen(true)}
            disabled={deleteSessionMutation.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded border border-[#D72C0D] bg-white px-4 text-sm font-medium text-[#D72C0D] shadow-sm transition hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
            Delete session
          </button>
          <Link
            className="inline-flex h-10 w-fit items-center gap-1.5 rounded border border-[#C9CCCF] bg-white px-4 text-sm font-medium text-[#202223] shadow-sm no-underline transition hover:bg-[#F6F6F7]"
            to="/conversations"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to inbox
          </Link>
        </div>
      </header>

      {threadQuery.isLoading && !threadQuery.data ? (
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
                  <dd className="m-0 text-right text-[#202223]">{formatLocalDate(session?.created_at || null)}</dd>
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
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-[#6D7175]">
                    <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                    Handoff
                  </dt>
                  <dd className="m-0 text-right text-[#202223]">{handoff ? handoffLabel(handoff.status) : 'Bot mode'}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-xl border border-[#E1E3E5] bg-white shadow-sm p-4">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 text-[#6D7175]" />
                <p className="m-0 text-xs font-medium uppercase tracking-wide text-[#6D7175]">Timeline</p>
              </div>
              <div className="mt-3 divide-y divide-[#E1E3E5]">
                {timelineEvents.map((event) => (
                  <div key={event.key} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <p className="m-0 text-sm text-[#6D7175]">{event.label}</p>
                    <p className="m-0 max-w-[170px] text-right text-sm font-medium leading-5 text-[#202223]">
                      {event.value}
                    </p>
                  </div>
                ))}
              </div>
              {sessionTickets.length > 0 ? (
                <div className="mt-3 border-t border-[#E1E3E5] pt-2">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-[#6D7175]">Tickets</p>
                  <div className="mt-1 space-y-1">
                    {sessionTickets.slice(0, 3).map((ticket) => (
                      <p key={ticket.id} className="m-0 text-xs text-[#202223]">
                        {ticket.ticket_key} · {ticket.status}
                      </p>
                    ))}
                    {sessionTickets.length > 3 ? (
                      <p className="m-0 text-xs text-[#6D7175]">+{sessionTickets.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          </aside>

          <section className="overflow-hidden rounded-xl border border-[#E1E3E5] bg-white shadow-sm">
            <div className="border-b border-[#E1E3E5] bg-[#F6F6F7] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#6D7175]">
              Thread
            </div>

            <div
              ref={threadContainerRef}
              onScroll={() => {
                const container = threadContainerRef.current
                if (!container) {
                  return
                }
                const distanceFromBottom =
                  container.scrollHeight - container.scrollTop - container.clientHeight
                shouldAutoScrollRef.current = distanceFromBottom <= 96
              }}
              className="max-h-[70vh] space-y-3 overflow-y-auto p-4"
            >
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C9CCCF] p-8 text-center">
                  <ChatBubbleLeftRightIcon className="mx-auto h-8 w-8 text-[#C9CCCF]" />
                  <p className="m-0 mt-2 text-sm font-medium text-[#202223]">No messages in this conversation yet.</p>
                </div>
              ) : null}

              {messages.map((message) => {
                const messageOrigin = (message.origin || (message.sender === 'user' ? 'user' : 'bot')).toLowerCase()
                const isAssistant = message.sender === 'assistant'
                const isAdminMessage = messageOrigin === 'admin'
                const isSystemMessage = messageOrigin === 'system'
                const hideFilenameCaption = shouldHideAttachmentFilenameCaption(message)
                const messageTickets = message.tickets || []
                const hasTicketTrigger = messageTickets.length > 0

                return (
                  <article
                    key={message.id}
                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[85%] rounded-xl border px-3 py-2.5 sm:max-w-[75%] ${isAssistant
                      ? isAdminMessage
                        ? 'border-[#CFE0F7] bg-[#F4F8FE]'
                        : isSystemMessage
                          ? 'border-[#D9DCE0] bg-[#F6F6F7]'
                          : 'border-[#D4ECDD] bg-[#F2F7F5]'
                      : 'border-[#D9DCE0] bg-[#F6F6F7]'
                      } ${hasTicketTrigger ? 'ring-1 ring-[#F9C8C5]' : ''}`}>
                      <header className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#4A5560]">
                            {messageOriginLabel(message.origin, message.sender)}
                          </span>
                          {isAdminMessage ? (
                            <span className="rounded-full bg-[#E8F3FF] px-2 py-0.5 text-[11px] font-medium text-[#0B5CAD]">Live</span>
                          ) : null}
                          {isSystemMessage ? (
                            <span className="rounded-full bg-[#EEF2F6] px-2 py-0.5 text-[11px] font-medium text-[#4A5560]">System</span>
                          ) : null}
                          {hasTicketTrigger ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-medium text-[#A0151A]">
                              <LifebuoyIcon className="h-3 w-3" />
                              Triggered ticket
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <time className="text-xs text-[#6D7175]">{formatLocalDateTime(message.created_at)}</time>
                          {isAdminMessage && (
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
                          {isAdminMessage ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetMessageId(message.id)}
                              disabled={deleteMutation.isPending}
                              className="text-[#6D7175] transition hover:text-[#D72C0D] focus:outline-none disabled:opacity-50"
                              title="Delete message"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          ) : null}
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
                      ) : !hideFilenameCaption ? (
                        <MarkdownMessage content={message.content} />
                      ) : null}

                      {message.attachments.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="space-y-1.5">
                              {isImageAttachment(attachment) ? (
                                <a
                                  href={resolveAttachmentUrl(attachment.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-md border border-[#C9CCCF] bg-white"
                                  title={attachment.original_filename || attachment.stored_name || 'Image'}
                                >
                                  <img
                                    src={resolveAttachmentUrl(attachment.url)}
                                    alt={attachment.original_filename || attachment.stored_name || 'Attachment'}
                                    className="block h-auto max-h-60 w-full min-w-[160px] object-contain bg-[#F6F6F7]"
                                    loading="lazy"
                                  />
                                </a>
                              ) : null}
                              <a
                                href={resolveAttachmentUrl(attachment.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-[#C9CCCF] bg-white px-2.5 py-1 text-xs font-medium text-[#202223] no-underline hover:bg-[#F6F6F7]"
                              >
                                <PaperClipIcon className="h-3 w-3 text-[#6D7175]" />
                                {attachment.original_filename || attachment.stored_name || attachment.url}
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {hasTicketTrigger ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {messageTickets.map((ticket) => (
                            <span
                              key={ticket.id}
                              className="rounded-full bg-[#FFF1F0] px-2 py-0.5 text-[11px] font-medium text-[#A0151A]"
                              title={ticket.subject || ticket.ticket_key}
                            >
                              {ticket.ticket_key} · {ticket.status}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>

                    <div className="border-t border-[#E1E3E5] bg-[#F6F6F7] p-4">
              {handoff?.status === 'pending_agent' ? (
                <div className="mb-3 rounded-lg border border-[#F9C8C5] bg-[#FFF5F5] px-3 py-2 text-sm text-[#8A1F1F]">
                  Customer is waiting for a live agent. Accept the handoff or reply to join the conversation.
                </div>
              ) : null}
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
                        shouldAutoScrollRef.current = true
                        replyMutation.mutate(newMessage.trim())
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newMessage.trim() && !replyMutation.isPending) {
                      shouldAutoScrollRef.current = true
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

      {isDeleteSessionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E3E5] bg-white p-4 shadow-xl">
            <h3 className="m-0 text-base font-semibold text-[#202223]">Delete entire session?</h3>
            <p className="m-0 mt-2 text-sm text-[#6D7175]">
              This will permanently remove the whole conversation and all messages.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteSessionModalOpen(false)}
                disabled={deleteSessionMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteSessionMutation.isPending) return
                  deleteSessionMutation.mutate()
                }}
                disabled={deleteSessionMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded border border-[#D72C0D] bg-[#D72C0D] px-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#B0250B] disabled:cursor-not-allowed disabled:bg-[#D72C0D] disabled:opacity-50"
              >
                {deleteSessionMutation.isPending ? 'Deleting...' : 'Delete session'}
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

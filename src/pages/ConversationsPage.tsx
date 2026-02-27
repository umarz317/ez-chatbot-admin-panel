import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { fetchAdminConversations, fetchAdminStats } from '../api/client'
import type { AdminPresenceState } from '../presence/useAdminPresence'
import {
  UsersIcon,
  ChatBubbleLeftEllipsisIcon,
  InboxStackIcon,
  CalendarDaysIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from '@heroicons/react/24/outline'

type ConversationsPageProps = {
  apiKey: string
  presence: AdminPresenceState
}

const PAGE_SIZE = 20

const inputClass =
  'w-full rounded border border-[#C9CCCF] bg-white px-3 py-2.5 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]'

const primaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded border border-[#008060] bg-[#008060] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:bg-[#008060] disabled:opacity-50'

const secondaryButtonClass =
  'inline-flex h-10 items-center justify-center rounded border border-[#C9CCCF] bg-white px-5 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50'

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

function deriveDisplayName(email: string | null, fullName: string | null): string {
  return fullName || email || 'Unknown user'
}

function initialsFromName(value: string): string {
  const words = value
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
  if (words.length === 0) {
    return 'U'
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

function formatLastSeen(value: string | null): string {
  if (!value) {
    return 'Offline'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Offline'
  }
  return `Last seen ${parsed.toLocaleString()}`
}

export function ConversationsPage({ apiKey, presence }: ConversationsPageProps) {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')

  const [filters, setFilters] = useState({
    q: '',
    userEmail: '',
    fromDate: '',
    toDate: '',
  })

  const conversationsQuery = useQuery({
    queryKey: ['admin-conversations', apiKey, page, filters],
    queryFn: () =>
      fetchAdminConversations(apiKey, {
        page,
        limit: PAGE_SIZE,
        q: filters.q,
        userEmail: filters.userEmail,
        fromDate: filters.fromDate ? `${filters.fromDate}T00:00:00Z` : '',
        toDate: filters.toDate ? `${filters.toDate}T23:59:59Z` : '',
      }),
  })

  const statsQuery = useQuery({
    queryKey: ['admin-stats', apiKey],
    queryFn: () => fetchAdminStats(apiKey),
  })

  const data = conversationsQuery.data
  const onlineUsersNow = presence.isConnected
    ? presence.onlineUsersCount
    : (statsQuery.data?.online_users_current ?? 0)

  const pageInfo = useMemo(() => {
    const totalPages = data?.total_pages ?? 0
    return {
      totalPages,
      hasPrev: page > 1,
      hasNext: totalPages > 0 && page < totalPages,
    }
  }, [data?.total_pages, page])

  const groupedConversations = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string
        displayName: string
        email: string | null
        isOnline: boolean
        lastSeenAt: string | null
        sessions: NonNullable<typeof data>['items']
      }
    >()

    ;(data?.items || []).forEach((item) => {
      const userKey = item.user.id != null
        ? `id:${item.user.id}`
        : item.user.email
          ? `email:${item.user.email.toLowerCase()}`
          : `session:${item.session_id}`

      const displayName = deriveDisplayName(item.user.email, item.user.full_name)
      const livePresence = presence.getPresenceForUser(item.user)
      const isOnline = livePresence?.is_online ?? item.is_online
      const lastSeenAt = livePresence?.last_seen_at ?? item.last_seen_at

      const existing = groups.get(userKey)
      if (!existing) {
        groups.set(userKey, {
          key: userKey,
          displayName,
          email: item.user.email,
          isOnline,
          lastSeenAt,
          sessions: [item],
        })
        return
      }

      existing.sessions.push(item)
      existing.isOnline = existing.isOnline || isOnline
      if (!existing.lastSeenAt || (lastSeenAt && new Date(lastSeenAt) > new Date(existing.lastSeenAt))) {
        existing.lastSeenAt = lastSeenAt
      }
    })

    return Array.from(groups.values())
  }, [data?.items, presence])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setFilters({
      q: searchInput.trim(),
      userEmail: emailInput.trim(),
      fromDate: fromInput,
      toDate: toInput,
    })
  }

  function clearFilters() {
    setPage(1)
    setSearchInput('')
    setEmailInput('')
    setFromInput('')
    setToInput('')
    setFilters({ q: '', userEmail: '', fromDate: '', toDate: '' })
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-[#202223]">Inbox</h1>
          <p className="m-0 mt-1 text-sm text-[#6D7175]">Review and manage customer chat sessions.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded border border-[#C9CCCF] bg-white px-3 py-2 text-sm font-medium text-[#202223] shadow-sm">
            {data?.total ?? 0} conversations
          </div>
          <div className="rounded border border-[#C9CCCF] bg-white px-3 py-2 text-sm font-medium text-[#202223] shadow-sm">
            {onlineUsersNow} online
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <article className="rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5 text-[#6D7175]" />
            <p className="m-0 text-xs font-medium text-[#6D7175]">Users</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{statsQuery.data?.total_users ?? '-'}</p>
        </article>
        <article className="rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <InboxStackIcon className="h-3.5 w-3.5 text-[#6D7175]" />
            <p className="m-0 text-xs font-medium text-[#6D7175]">Sessions</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{statsQuery.data?.total_sessions ?? '-'}</p>
        </article>
        <article className="rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5 text-[#6D7175]" />
            <p className="m-0 text-xs font-medium text-[#6D7175]">Messages</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{statsQuery.data?.total_messages ?? '-'}</p>
        </article>
        <article className="rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="h-3.5 w-3.5 text-[#6D7175]" />
            <p className="m-0 text-xs font-medium text-[#6D7175]">Today</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{statsQuery.data?.messages_today ?? '-'}</p>
        </article>
      </div>

      <form
        className="grid grid-cols-1 gap-2 rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm md:grid-cols-2 xl:grid-cols-[2fr_1.5fr_1fr_1fr_auto_auto]"
        onSubmit={applyFilters}
      >
        <input
          placeholder="Search session or message"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className={inputClass}
        />
        <input
          placeholder="Filter by customer email"
          value={emailInput}
          onChange={(event) => setEmailInput(event.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={fromInput}
          onChange={(event) => setFromInput(event.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={toInput}
          onChange={(event) => setToInput(event.target.value)}
          className={inputClass}
        />
        <button type="submit" className={primaryButtonClass}>
          <FunnelIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
          Apply
        </button>
        <button type="button" className={secondaryButtonClass} onClick={clearFilters}>
          <XMarkIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
          Clear
        </button>
      </form>

      {conversationsQuery.isError ? (
        <div className="flex items-start gap-2 rounded border border-[#E4B4B4] bg-[#FFF5F5] px-3 py-2.5 text-sm text-[#8A1F1F]">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{(conversationsQuery.error as Error).message}</span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#E1E3E5] bg-white shadow-sm">
        <div className="border-b border-[#E1E3E5] bg-[#F6F6F7] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#6D7175]">
          Conversation list
        </div>

        <div className="divide-y divide-[#E1E3E5]">
          {conversationsQuery.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
              <div key={`loading-${index}`} className="animate-pulse px-4 py-4">
                <div className="h-3 w-1/4 rounded bg-[#E1E3E5]" />
                <div className="mt-2 h-3 w-1/2 rounded bg-[#E1E3E5]" />
              </div>
            ))
            : null}

          {!conversationsQuery.isLoading && (data?.items?.length || 0) === 0 ? (
            <div className="px-4 py-10 text-center">
              <InboxIcon className="mx-auto h-8 w-8 text-[#C9CCCF]" />
              <p className="m-0 mt-2 text-sm font-medium text-[#202223]">No conversations found</p>
              <p className="m-0 mt-1 text-sm text-[#6D7175]">Try adjusting the filters above.</p>
            </div>
          ) : null}

          {groupedConversations.map((group) => (
            <div key={group.key} className="border-b border-[#E1E3E5] last:border-b-0">
              <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 bg-[#F9FAFB] px-4 py-3">
                <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-[#E3F1DF] text-xs font-semibold text-[#005B3E]">
                  {initialsFromName(group.displayName)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="m-0 truncate text-sm font-semibold text-[#202223]">{group.displayName}</p>
                    <span className="rounded-full bg-[#EEF2F6] px-2 py-0.5 text-[11px] font-medium text-[#4A5560]">
                      {group.sessions.length} sessions
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        group.isOnline
                          ? 'bg-[#E3F1DF] text-[#005B3E]'
                          : 'bg-[#F1F2F3] text-[#6D7175]'
                      }`}
                    >
                      {group.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="m-0 mt-1 truncate text-xs text-[#8C9196]">{group.email || 'No email'}</p>
                  {!group.isOnline ? (
                    <p className="m-0 mt-1 text-[11px] text-[#8C9196]">
                      {formatLastSeen(group.lastSeenAt)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="divide-y divide-[#E1E3E5]">
                {group.sessions.map((item) => {
                  const conversationTitle = (item.title || '').trim() || 'Untitled chat'
                  return (
                    <Link
                      key={item.session_id}
                      to={`/conversations/${encodeURIComponent(item.session_id)}`}
                      className="group block px-4 py-3 no-underline transition hover:bg-[#F6F6F7]"
                    >
                      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="m-0 truncate text-sm font-semibold text-[#202223]">{conversationTitle}</p>
                            <span className="rounded-full bg-[#F2F7F5] px-2 py-0.5 text-[11px] font-medium text-[#005B3E]">
                              {item.message_count} msgs
                            </span>
                            {item.last_message?.sender ? (
                              <span className="rounded-full bg-[#EEF2F6] px-2 py-0.5 text-[11px] font-medium text-[#4A5560]">
                                {item.last_message.sender}
                              </span>
                            ) : null}
                          </div>
                          <p className="m-0 mt-1 line-clamp-1 text-sm text-[#6D7175]">
                            {item.last_message?.content || 'No messages yet.'}
                          </p>
                          <p className="m-0 mt-1 font-mono text-[11px] text-[#8C9196]">session: {item.session_id}</p>
                        </div>

                        <div className="text-right text-xs text-[#6D7175]">
                          <p className="m-0">{formatShortDate(item.created_at)}</p>
                          <p className="m-0 mt-1">{formatDate(item.created_at).split(',')[1]?.trim() || ''}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="flex flex-col items-center justify-between gap-2 rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm sm:flex-row">
        <p className="m-0 text-sm text-[#6D7175]">
          Page {page} of {pageInfo.totalPages || 1}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!pageInfo.hasPrev}
            className={secondaryButtonClass}
          >
            <ChevronLeftIcon className="-ml-0.5 mr-1 h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!pageInfo.hasNext}
            className={secondaryButtonClass}
          >
            Next
            <ChevronRightIcon className="-mr-0.5 ml-1 h-4 w-4" />
          </button>
        </div>
      </footer>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  UsersIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { deleteAdminUser, fetchAdminConversations, fetchAdminStats, fetchAdminUsers } from '../api/client'
import type { AdminPresenceState } from '../presence/useAdminPresence'
import { formatLocalDate, formatLocalDateTime, formatLocalLastSeen } from '../utils/datetime'

type UsersPageProps = {
  apiKey: string
  presence: AdminPresenceState
}

const PAGE_SIZE = 20

function displayUserName(email: string | null, name: string | null): string {
  return name || email || 'Unknown user'
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

function handoffLabel(status: 'bot' | 'pending_agent' | 'agent_active'): string {
  if (status === 'pending_agent') return 'Awaiting agent'
  if (status === 'agent_active') return 'Live agent'
  return 'Bot'
}

function handoffBadgeClass(status: 'bot' | 'pending_agent' | 'agent_active'): string {
  if (status === 'pending_agent') return 'bg-[#FFF1F0] text-[#A0151A]'
  if (status === 'agent_active') return 'bg-[#E8F3FF] text-[#0B5CAD]'
  return 'bg-[#EEF2F6] text-[#4A5560]'
}

export function UsersPage({ apiKey, presence }: UsersPageProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null)
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null)

  const usersQuery = useQuery({
    queryKey: ['admin-users', apiKey, page, search, presence.conversationEventsVersion],
    queryFn: () =>
      fetchAdminUsers(apiKey, {
        page,
        limit: PAGE_SIZE,
        q: search,
      }),
    placeholderData: (previous) => previous,
  })

  const statsQuery = useQuery({
    queryKey: ['admin-stats', apiKey],
    queryFn: () => fetchAdminStats(apiKey),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => deleteAdminUser(apiKey, userId),
    onSuccess: (_result, deletedUserId) => {
      setDeleteCandidateId(null)
      setModalErrorMessage(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users', apiKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-user-sessions', apiKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-conversations', apiKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats', apiKey] })
      setSelectedUserId((current) => (current === deletedUserId ? null : current))
    },
    onError: (error: Error) => {
      setModalErrorMessage(`Failed to delete user: ${error.message}`)
    },
  })

  const selectedUser = useMemo(() => {
    const items = usersQuery.data?.items || []
    if (!items.length) {
      return null
    }
    if (selectedUserId === null) {
      return items[0]
    }
    return items.find((item) => item.user.id === selectedUserId) || items[0]
  }, [selectedUserId, usersQuery.data?.items])

  useEffect(() => {
    if (selectedUser?.user.id != null) {
      setSelectedUserId(selectedUser.user.id)
    }
  }, [selectedUser?.user.id])

  const selectedUserEmail = (selectedUser?.user.email || '').trim()
  const sessionsQuery = useQuery({
    queryKey: ['admin-user-sessions', apiKey, selectedUserEmail, presence.conversationEventsVersion],
    queryFn: () =>
      fetchAdminConversations(apiKey, {
        page: 1,
        limit: 20,
        q: '',
        userEmail: selectedUserEmail,
        fromDate: '',
        toDate: '',
        handoffStatus: 'all',
      }),
    enabled: Boolean(selectedUserEmail),
    placeholderData: (previous) => previous,
  })

  const onlineUsersNow = presence.isConnected
    ? presence.onlineUsersCount
    : (statsQuery.data?.online_users_current ?? 0)

  const pageInfo = useMemo(() => {
    const totalPages = usersQuery.data?.total_pages ?? 0
    return {
      totalPages,
      hasPrev: page > 1,
      hasNext: totalPages > 0 && page < totalPages,
    }
  }, [usersQuery.data?.total_pages, page])

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function clearSearch() {
    setPage(1)
    setSearchInput('')
    setSearch('')
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-[#202223]">Users</h1>
          <p className="m-0 mt-1 text-sm text-[#6D7175]">Browse saved customers and jump into their conversations.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded border border-[#C9CCCF] bg-white px-3 py-2 text-sm font-medium text-[#202223] shadow-sm">
            {usersQuery.data?.total ?? 0} customers
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
            <p className="m-0 text-xs font-medium text-[#6D7175]">Customers</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{statsQuery.data?.total_users ?? '-'}</p>
        </article>
        <article className="rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 text-[#6D7175]" />
            <p className="m-0 text-xs font-medium text-[#6D7175]">Sessions</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{statsQuery.data?.total_sessions ?? '-'}</p>
        </article>
        <article className="rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <UserCircleIcon className="h-3.5 w-3.5 text-[#6D7175]" />
            <p className="m-0 text-xs font-medium text-[#6D7175]">Online now</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{onlineUsersNow}</p>
        </article>
        <article className="rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 text-[#6D7175]" />
            <p className="m-0 text-xs font-medium text-[#6D7175]">Filtered</p>
          </div>
          <p className="m-0 mt-1 text-xl font-semibold text-[#202223]">{usersQuery.data?.items.length ?? 0}</p>
        </article>
      </div>

      <form
        className="flex flex-col gap-2 rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm sm:flex-row"
        onSubmit={applySearch}
      >
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name, email, username, or phone"
          className="w-full rounded border border-[#C9CCCF] bg-white px-3 py-2.5 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded border border-[#008060] bg-[#008060] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52]"
        >
          Search
        </button>
        <button
          type="button"
          onClick={clearSearch}
          className="inline-flex h-10 items-center justify-center rounded border border-[#C9CCCF] bg-white px-5 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7]"
        >
          Clear
        </button>
      </form>

      {(usersQuery.isError || sessionsQuery.isError) ? (
        <div className="flex items-start gap-2 rounded border border-[#E4B4B4] bg-[#FFF5F5] px-3 py-2.5 text-sm text-[#8A1F1F]">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{(usersQuery.error as Error)?.message || (sessionsQuery.error as Error)?.message}</span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="overflow-hidden rounded-xl border border-[#E1E3E5] bg-white shadow-sm">
          <div className="border-b border-[#E1E3E5] bg-[#F6F6F7] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#6D7175]">
            Customer list
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {usersQuery.isLoading && !usersQuery.data ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-lg bg-[#F6F6F7]" />
                ))}
              </div>
            ) : null}
            {!usersQuery.isLoading && (usersQuery.data?.items.length || 0) === 0 ? (
              <div className="p-8 text-center">
                <UsersIcon className="mx-auto h-8 w-8 text-[#C9CCCF]" />
                <p className="m-0 mt-2 text-sm font-medium text-[#202223]">No users found</p>
              </div>
            ) : null}
            {(usersQuery.data?.items || []).map((item) => {
              const userName = displayUserName(item.user.email, item.user.full_name)
              const isSelected = item.user.id === selectedUser?.user.id
              const livePresence = presence.getPresenceForUser(item.user)
              const isOnline = livePresence?.is_online ?? item.is_online
              const lastSeenAt = livePresence?.last_seen_at ?? item.last_seen_at
              return (
                <button
                  key={item.user.id ?? item.user.email ?? userName}
                  type="button"
                  onClick={() => setSelectedUserId(item.user.id)}
                  className={`flex w-full items-start gap-3 border-0 border-b border-[#E1E3E5] px-4 py-3 text-left transition last:border-b-0 ${
                    isSelected ? 'bg-[#F2F7F5]' : 'bg-white hover:bg-[#F6F6F7]'
                  }`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E3F1DF] text-sm font-semibold text-[#005B3E]">
                    {initialsFromName(userName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="m-0 truncate text-sm font-semibold text-[#202223]">{userName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isOnline ? 'bg-[#E3F1DF] text-[#005B3E]' : 'bg-[#F1F2F3] text-[#6D7175]'
                      }`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="m-0 mt-0.5 truncate text-sm text-[#6D7175]">{item.user.email || '-'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#6D7175]">
                      <span>{item.session_count} sessions</span>
                      <span>{item.open_ticket_count} open tickets</span>
                      <span>{formatLocalLastSeen(lastSeenAt)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between border-t border-[#E1E3E5] bg-[#F6F6F7] px-4 py-3">
            <p className="m-0 text-sm text-[#6D7175]">
              Page {page} of {pageInfo.totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!pageInfo.hasPrev}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#C9CCCF] bg-white text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!pageInfo.hasNext}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-[#C9CCCF] bg-white text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#E1E3E5] bg-white shadow-sm">
          <div className="border-b border-[#E1E3E5] bg-[#F6F6F7] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#6D7175]">
            User detail
          </div>
          {selectedUser ? (
            <div className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#E3F1DF] text-base font-semibold text-[#005B3E]">
                  {initialsFromName(displayUserName(selectedUser.user.email, selectedUser.user.full_name))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-lg font-semibold text-[#202223]">
                    {displayUserName(selectedUser.user.email, selectedUser.user.full_name)}
                  </p>
                  <p className="m-0 mt-1 text-sm text-[#6D7175]">{selectedUser.user.email || '-'}</p>
                  <p className="m-0 mt-1 text-sm text-[#6D7175]">{selectedUser.user.phone || 'No phone'}</p>
                </div>
                {selectedUser.user.id !== null ? (
                  <button
                    type="button"
                    onClick={() => setDeleteCandidateId(selectedUser.user.id)}
                    disabled={deleteUserMutation.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded border border-[#D72C0D] bg-white px-3 text-sm font-medium text-[#D72C0D] shadow-sm transition hover:bg-[#FFF5F5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#E1E3E5] bg-[#FAFBFB] px-3 py-2.5">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-[#6D7175]">Last seen</p>
                  <p className="m-0 mt-1 text-sm text-[#202223]">{formatLocalLastSeen(selectedUser.last_seen_at)}</p>
                </div>
                <div className="rounded-lg border border-[#E1E3E5] bg-[#FAFBFB] px-3 py-2.5">
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-[#6D7175]">Latest session</p>
                  <p className="m-0 mt-1 text-sm text-[#202223]">{formatLocalDateTime(selectedUser.latest_session_at)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="m-0 text-sm font-semibold text-[#202223]">Recent sessions</p>
                  <span className="text-xs text-[#6D7175]">{sessionsQuery.data?.items.length ?? 0} shown</span>
                </div>
                <div className="mt-3 space-y-2">
                  {sessionsQuery.isLoading && !sessionsQuery.data ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-20 animate-pulse rounded-lg bg-[#F6F6F7]" />
                    ))
                  ) : null}
                  {(sessionsQuery.data?.items || []).map((session) => (
                    <Link
                      key={session.session_id}
                      to={`/conversations/${encodeURIComponent(session.session_id)}`}
                      className="block rounded-lg border border-[#E1E3E5] bg-white px-3 py-3 text-inherit no-underline transition hover:border-[#C9CCCF] hover:bg-[#FAFBFB]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-medium text-[#202223]">
                            {(session.title || '').trim() || 'Untitled chat'}
                          </p>
                          <p className="m-0 mt-1 text-xs text-[#6D7175]">
                            {formatLocalDate(session.created_at)} · {formatLocalDateTime(session.created_at)}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${handoffBadgeClass(session.handoff.status)}`}>
                          {handoffLabel(session.handoff.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {!sessionsQuery.isLoading && (sessionsQuery.data?.items.length || 0) === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#C9CCCF] p-6 text-center text-sm text-[#6D7175]">
                      No sessions found for this user.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <UsersIcon className="mx-auto h-8 w-8 text-[#C9CCCF]" />
              <p className="m-0 mt-2 text-sm font-medium text-[#202223]">Select a user</p>
            </div>
          )}
        </section>
      </div>

      {deleteCandidateId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E1E3E5] bg-white p-4 shadow-xl">
            <h3 className="m-0 text-base font-semibold text-[#202223]">Delete user?</h3>
            <p className="m-0 mt-2 text-sm text-[#6D7175]">
              This will remove the user and all linked sessions, messages, tickets, and discount codes.
            </p>
            {modalErrorMessage ? (
              <div className="mt-3 rounded border border-[#E4B4B4] bg-[#FFF5F5] px-3 py-2 text-sm text-[#8A1F1F]">
                {modalErrorMessage}
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteCandidateId(null)
                  setModalErrorMessage(null)
                }}
                disabled={deleteUserMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteUserMutation.isPending) {
                    return
                  }
                  deleteUserMutation.mutate(deleteCandidateId)
                }}
                disabled={deleteUserMutation.isPending}
                className="inline-flex h-9 items-center justify-center rounded border border-[#D72C0D] bg-[#D72C0D] px-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#B0250B] disabled:cursor-not-allowed disabled:bg-[#D72C0D] disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ExclamationTriangleIcon,
  LifebuoyIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

import { fetchAdminStats, fetchAdminTicket, fetchAdminTickets, updateAdminTicket } from '../api/client'
import type { AdminTicketStatus } from '../types'

type TicketsPageProps = {
  apiKey: string
}

const PAGE_SIZE = 20

const statusOptions: Array<{ value: AdminTicketStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

function statusClass(status: AdminTicketStatus): string {
  if (status === 'open') {
    return 'bg-[#FFF5F5] text-[#8A1F1F]'
  }
  if (status === 'in_progress') {
    return 'bg-[#FFF8E6] text-[#7A4F01]'
  }
  if (status === 'resolved') {
    return 'bg-[#E3F1DF] text-[#005B3E]'
  }
  return 'bg-[#EEF2F6] text-[#4A5560]'
}

export function TicketsPage({ apiKey }: TicketsPageProps) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminTicketStatus>('all')
  const [filters, setFilters] = useState({
    q: '',
    status: 'all' as 'all' | AdminTicketStatus,
  })
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState<AdminTicketStatus>('open')

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets', apiKey, page, filters],
    queryFn: () =>
      fetchAdminTickets(apiKey, {
        page,
        limit: PAGE_SIZE,
        q: filters.q,
        status: filters.status,
      }),
  })

  const statsQuery = useQuery({
    queryKey: ['admin-stats', apiKey],
    queryFn: () => fetchAdminStats(apiKey),
  })

  const selectedTicketQuery = useQuery({
    queryKey: ['admin-ticket-detail', apiKey, selectedTicketId],
    queryFn: () => fetchAdminTicket(apiKey, selectedTicketId as number),
    enabled: selectedTicketId !== null,
  })

  const updateTicketMutation = useMutation({
    mutationFn: (payload: { status: AdminTicketStatus; admin_note: string }) =>
      updateAdminTicket(apiKey, selectedTicketId as number, payload),
    onSuccess: (result) => {
      setNoteDraft(result.ticket.admin_note || '')
      setStatusDraft(result.ticket.status)
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-detail', apiKey, selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-tickets', apiKey] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats', apiKey] })
    },
  })

  const pageInfo = useMemo(() => {
    const totalPages = ticketsQuery.data?.total_pages ?? 0
    return {
      totalPages,
      hasPrev: page > 1,
      hasNext: totalPages > 0 && page < totalPages,
    }
  }, [ticketsQuery.data?.total_pages, page])

  const selectedTicket = selectedTicketQuery.data?.ticket || null

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setFilters({
      q: searchInput.trim(),
      status: statusFilter,
    })
  }

  function selectTicket(ticketId: number, initialStatus: AdminTicketStatus, initialNote: string | null) {
    setSelectedTicketId(ticketId)
    setStatusDraft(initialStatus)
    setNoteDraft(initialNote || '')
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-[#202223]">Tickets</h1>
          <p className="m-0 mt-1 text-sm text-[#6D7175]">Track and manage design review/support tickets.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded border border-[#C9CCCF] bg-white px-3 py-2 text-sm font-medium text-[#202223] shadow-sm">
            {ticketsQuery.data?.total ?? 0} total
          </div>
          <div className="rounded border border-[#C9CCCF] bg-white px-3 py-2 text-sm font-medium text-[#202223] shadow-sm">
            {statsQuery.data?.open_tickets_current ?? 0} open
          </div>
        </div>
      </header>

      <form
        className="grid grid-cols-1 gap-2 rounded-xl border border-[#E1E3E5] bg-white p-3 shadow-sm md:grid-cols-[2fr_1fr_auto]"
        onSubmit={applyFilters}
      >
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6D7175]" />
          <input
            placeholder="Search ticket key, user email, subject"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="w-full rounded border border-[#C9CCCF] bg-white py-2.5 pl-9 pr-3 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | AdminTicketStatus)}
          className="w-full rounded border border-[#C9CCCF] bg-white px-3 py-2.5 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded border border-[#008060] bg-[#008060] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52]"
        >
          Apply
        </button>
      </form>

      {(ticketsQuery.isError || selectedTicketQuery.isError || updateTicketMutation.isError) ? (
        <div className="flex items-start gap-2 rounded border border-[#E4B4B4] bg-[#FFF5F5] px-3 py-2.5 text-sm text-[#8A1F1F]">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {(ticketsQuery.error as Error)?.message
              || (selectedTicketQuery.error as Error)?.message
              || (updateTicketMutation.error as Error)?.message}
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="overflow-hidden rounded-xl border border-[#E1E3E5] bg-white shadow-sm">
          <div className="border-b border-[#E1E3E5] bg-[#F6F6F7] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#6D7175]">
            Ticket list
          </div>
          <div className="divide-y divide-[#E1E3E5]">
            {ticketsQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={`ticket-loading-${index}`} className="animate-pulse px-4 py-4">
                  <div className="h-3 w-1/3 rounded bg-[#E1E3E5]" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-[#E1E3E5]" />
                </div>
              ))
            ) : null}

            {!ticketsQuery.isLoading && (ticketsQuery.data?.items.length || 0) === 0 ? (
              <div className="px-4 py-10 text-center">
                <LifebuoyIcon className="mx-auto h-8 w-8 text-[#C9CCCF]" />
                <p className="m-0 mt-2 text-sm font-medium text-[#202223]">No tickets found</p>
              </div>
            ) : null}

            {(ticketsQuery.data?.items || []).map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => selectTicket(ticket.id, ticket.status, ticket.admin_note)}
                className={`block w-full cursor-pointer px-4 py-3 text-left no-underline transition hover:bg-[#F6F6F7] ${selectedTicketId === ticket.id ? 'bg-[#F6F6F7]' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-semibold text-[#202223]">{ticket.ticket_key}</p>
                    <p className="m-0 mt-1 line-clamp-1 text-sm text-[#6D7175]">{ticket.subject || ticket.description || 'No subject'}</p>
                    <p className="m-0 mt-1 text-xs text-[#8C9196]">{ticket.user.email || 'Unknown user'} • {formatDate(ticket.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-[#E1E3E5] px-4 py-3">
            <p className="m-0 text-sm text-[#6D7175]">Page {page} of {pageInfo.totalPages || 1}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!pageInfo.hasPrev}
                className="inline-flex h-9 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeftIcon className="mr-1 h-4 w-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!pageInfo.hasNext}
                className="inline-flex h-9 items-center justify-center rounded border border-[#C9CCCF] bg-white px-3 text-sm font-medium text-[#202223] shadow-sm transition hover:bg-[#F6F6F7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <article className="rounded-xl border border-[#E1E3E5] bg-white p-4 shadow-sm">
          {!selectedTicket ? (
            <div className="grid min-h-[300px] place-items-center text-center">
              <div>
                <LifebuoyIcon className="mx-auto h-8 w-8 text-[#C9CCCF]" />
                <p className="m-0 mt-2 text-sm font-medium text-[#202223]">Select a ticket</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-lg font-semibold text-[#202223]">{selectedTicket.ticket_key}</h2>
                  <p className="m-0 mt-1 text-sm text-[#6D7175]">{selectedTicket.subject || 'No subject'}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
              </div>

              <div className="rounded border border-[#E1E3E5] bg-[#F6F6F7] p-3 text-sm text-[#202223]">
                <p className="m-0"><strong>User:</strong> {selectedTicket.user.full_name || selectedTicket.user.email || '-'}</p>
                <p className="m-0 mt-1"><strong>Email:</strong> {selectedTicket.user.email || '-'}</p>
                <p className="m-0 mt-1"><strong>Created:</strong> {formatDate(selectedTicket.created_at)}</p>
                <p className="m-0 mt-1"><strong>Email sent:</strong> {formatDate(selectedTicket.email_sent_at)}</p>
                {selectedTicket.session?.session_id ? (
                  <p className="m-0 mt-1">
                    <strong>Session:</strong>{' '}
                    <Link to={`/conversations/${encodeURIComponent(selectedTicket.session.session_id)}`} className="text-[#006E52]">
                      {selectedTicket.session.session_id}
                    </Link>
                  </p>
                ) : null}
                {selectedTicket.attachment?.url ? (
                  <p className="m-0 mt-1">
                    <strong>Attachment:</strong>{' '}
                    <a href={selectedTicket.attachment.url} target="_blank" rel="noreferrer" className="text-[#006E52]">
                      {selectedTicket.attachment.original_filename || selectedTicket.attachment.stored_name || 'Open image'}
                    </a>
                  </p>
                ) : null}
              </div>

              <div>
                <p className="m-0 text-sm font-medium text-[#202223]">Description</p>
                <p className="m-0 mt-1 whitespace-pre-wrap text-sm text-[#6D7175]">{selectedTicket.description || '-'}</p>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr]">
                <select
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value as AdminTicketStatus)}
                  className="h-10 rounded border border-[#C9CCCF] bg-white px-3 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Admin note"
                  className="w-full rounded border border-[#C9CCCF] bg-white px-3 py-2 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                />
              </div>

              <button
                type="button"
                disabled={updateTicketMutation.isPending}
                onClick={() => updateTicketMutation.mutate({ status: statusDraft, admin_note: noteDraft.trim() })}
                className="inline-flex h-10 items-center justify-center rounded border border-[#008060] bg-[#008060] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateTicketMutation.isPending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

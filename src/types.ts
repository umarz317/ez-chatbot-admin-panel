export type AdminUser = {
  id: number | null
  full_name: string | null
  username: string | null
  email: string | null
  phone: string | null
}

export type LastMessage = {
  sender: string
  content: string
  created_at: string | null
}

export type AdminConversation = {
  session_id: string
  title: string | null
  created_at: string | null
  user: AdminUser
  is_online: boolean
  last_seen_at: string | null
  message_count: number
  open_ticket_count?: number
  last_message: LastMessage | null
}

export type AdminConversationsResponse = {
  page: number
  limit: number
  total: number
  total_pages: number
  items: AdminConversation[]
}

export type AdminAttachment = {
  id: number
  type: string
  url: string
  original_filename: string | null
  stored_name: string | null
  mime_type: string | null
  size_bytes: number | null
  created_at: string | null
}

export type AdminMessage = {
  id: number
  sender: string
  content: string
  created_at: string | null
  attachments: AdminAttachment[]
  tickets?: Array<{
    id: number
    ticket_key: string
    status: string
    subject: string | null
    message_id: number | null
    created_at: string | null
  }>
}

export type AdminConversationThreadResponse = {
  session: {
    session_id: string
    title: string | null
    created_at: string | null
    open_ticket_count?: number
    user: AdminUser
    is_online: boolean
    last_seen_at: string | null
  }
  messages: AdminMessage[]
  tickets?: Array<{
    id: number
    ticket_key: string
    status: string
    subject: string | null
    message_id: number | null
    created_at: string | null
  }>
}

export type AdminStats = {
  total_users: number
  total_sessions: number
  total_messages: number
  messages_today: number
  active_users_last_7_days: number
  online_users_current: number
  open_tickets_current?: number
}

export type AdminTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type AdminTicket = {
  id: number
  ticket_key: string
  category: string
  subject: string | null
  description: string | null
  status: AdminTicketStatus
  priority: string
  admin_note: string | null
  email_sent_at: string | null
  created_at: string | null
  updated_at: string | null
  user: AdminUser
  session: {
    id: number
    session_id: string
    title: string | null
  } | null
  message: {
    id: number
    sender: string
    content: string
    created_at: string | null
  } | null
  attachment: AdminAttachment | null
}

export type AdminTicketsResponse = {
  page: number
  limit: number
  total: number
  total_pages: number
  items: AdminTicket[]
}

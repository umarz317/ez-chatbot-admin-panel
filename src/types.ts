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
}

export type AdminConversationThreadResponse = {
  session: {
    session_id: string
    title: string | null
    created_at: string | null
    user: AdminUser
    is_online: boolean
    last_seen_at: string | null
  }
  messages: AdminMessage[]
}

export type AdminStats = {
  total_users: number
  total_sessions: number
  total_messages: number
  messages_today: number
  active_users_last_7_days: number
  online_users_current: number
}

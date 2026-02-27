import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'

import { API_BASE_URL } from '../config'
import type { AdminUser } from '../types'

export type UserPresence = {
  user_key: string
  user_id: number | null
  email: string | null
  is_online: boolean
  last_seen_at: string | null
}

type PresenceSnapshotPayload = {
  users?: UserPresence[]
}

function keyForUser(user: AdminUser | null | undefined): string | null {
  if (!user) {
    return null
  }
  if (user.id !== null && user.id !== undefined) {
    return `id:${user.id}`
  }
  if (user.email) {
    return `email:${user.email.toLowerCase()}`
  }
  return null
}

export type AdminPresenceState = {
  isConnected: boolean
  onlineUsersCount: number
  getPresenceForUser: (user: AdminUser | null | undefined) => UserPresence | null
}

export function useAdminPresence(authToken: string): AdminPresenceState {
  const [isConnected, setIsConnected] = useState(false)
  const [presenceByUserKey, setPresenceByUserKey] = useState<Record<string, UserPresence>>({})

  useEffect(() => {
    if (!authToken) {
      return undefined
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: {
        role: 'admin',
        token: authToken,
      },
    })

    const handleConnect = () => {
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleSnapshot = (payload: PresenceSnapshotPayload) => {
      const users = Array.isArray(payload?.users) ? payload.users : []
      const next: Record<string, UserPresence> = {}
      users.forEach((presence) => {
        if (!presence?.user_key) {
          return
        }
        next[presence.user_key] = presence
      })
      setPresenceByUserKey(next)
    }

    const handleUpdate = (payload: UserPresence) => {
      if (!payload?.user_key) {
        return
      }
      setPresenceByUserKey((previous) => ({
        ...previous,
        [payload.user_key]: payload,
      }))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleDisconnect)
    socket.on('presence:snapshot', handleSnapshot)
    socket.on('presence:update', handleUpdate)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleDisconnect)
      socket.off('presence:snapshot', handleSnapshot)
      socket.off('presence:update', handleUpdate)
      socket.disconnect()
      setIsConnected(false)
      setPresenceByUserKey({})
    }
  }, [authToken])

  const onlineUsersCount = useMemo(() => {
    return Object.values(presenceByUserKey).filter((presence) => presence.is_online).length
  }, [presenceByUserKey])

  return {
    isConnected,
    onlineUsersCount,
    getPresenceForUser: (user: AdminUser | null | undefined) => {
      const userKey = keyForUser(user)
      if (!userKey) {
        return null
      }
      return presenceByUserKey[userKey] || null
    },
  }
}

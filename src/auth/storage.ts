const ADMIN_TOKEN_STORAGE = 'ezx_admin_auth_token'
const LEGACY_ADMIN_KEY_STORAGE = 'ezx_admin_api_key'

function safeGet(key: string): string {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage write failures (private mode / disabled storage).
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage remove failures.
  }
}

export function getAdminAuthToken(): string {
  const token = safeGet(ADMIN_TOKEN_STORAGE)
  if (token) {
    return token
  }
  return safeGet(LEGACY_ADMIN_KEY_STORAGE)
}

export function setAdminAuthToken(value: string): void {
  const normalized = value.trim()
  safeSet(ADMIN_TOKEN_STORAGE, normalized)
  safeRemove(LEGACY_ADMIN_KEY_STORAGE)
}

export function clearAdminAuthToken(): void {
  safeRemove(ADMIN_TOKEN_STORAGE)
  safeRemove(LEGACY_ADMIN_KEY_STORAGE)
}

// Backward-compatible wrappers for existing imports.
export function getAdminApiKey(): string {
  return getAdminAuthToken()
}

export function setAdminApiKey(value: string): void {
  setAdminAuthToken(value)
}

export function clearAdminApiKey(): void {
  clearAdminAuthToken()
}

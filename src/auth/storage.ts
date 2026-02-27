const ADMIN_KEY_STORAGE = 'ezx_admin_api_key'

export function getAdminApiKey(): string {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || ''
}

export function setAdminApiKey(value: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE, value.trim())
}

export function clearAdminApiKey(): void {
  localStorage.removeItem(ADMIN_KEY_STORAGE)
}

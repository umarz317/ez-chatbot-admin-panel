function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function resolveApiBaseUrl(): string {
  const configured = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || '')
  if (configured) {
    return configured
  }

  if (import.meta.env.PROD) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return normalizeBaseUrl(window.location.origin)
    }
    throw new Error('VITE_API_BASE_URL must be configured for production builds.')
  }

  return 'http://localhost:5050'
}

function resolveTimeoutMs(): number {
  const raw = (import.meta.env.VITE_API_TIMEOUT_MS || '').trim()
  if (!raw) {
    return 15_000
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 1_000) {
    return 15_000
  }
  return Math.floor(parsed)
}

export const API_BASE_URL = resolveApiBaseUrl()
export const API_REQUEST_TIMEOUT_MS = resolveTimeoutMs()
export const IS_PRODUCTION = import.meta.env.PROD

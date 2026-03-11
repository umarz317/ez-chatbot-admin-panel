const API_TIMEZONE_RE = /(z|[+-]\d{2}:\d{2})$/i

export function parseApiDate(value: string | null | undefined): Date | null {
  const raw = (value || '').trim()
  if (!raw) {
    return null
  }

  const normalized = API_TIMEZONE_RE.test(raw) ? raw : `${raw}Z`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export function formatLocalDateTime(value: string | null | undefined): string {
  const parsed = parseApiDate(value)
  if (!parsed) {
    return '-'
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(parsed)
}

export function formatLocalDate(value: string | null | undefined): string {
  const parsed = parseApiDate(value)
  if (!parsed) {
    return '-'
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

export function formatLocalTime(value: string | null | undefined): string {
  const parsed = parseApiDate(value)
  if (!parsed) {
    return '-'
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(parsed)
}

export function formatLocalLastSeen(value: string | null | undefined): string {
  const formatted = formatLocalDateTime(value)
  if (formatted === '-') {
    return 'Offline'
  }
  return `Last seen ${formatted}`
}

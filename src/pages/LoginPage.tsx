import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { fetchAdminStats } from '../api/client'
import {
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

type LoginPageProps = {
  apiKey: string
  onAuthenticated: (apiKey: string) => void
}

type LocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage({ apiKey, onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null
    return state?.from?.pathname || '/conversations'
  }, [location.state])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!keyInput.trim()) {
      setError('Admin API key is required.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await fetchAdminStats(keyInput.trim())
      onAuthenticated(keyInput.trim())
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden w-[480px] shrink-0 flex-col justify-between overflow-hidden bg-[#004C3F] p-10 text-white lg:flex">
        {/* Background SVG Design */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <svg
            className="absolute left-0 top-0 h-full w-full"
            viewBox="0 0 480 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <circle cx="50" cy="50" r="200" fill="white" fillOpacity="0.03" />
            <circle cx="450" cy="650" r="300" fill="white" fillOpacity="0.03" />
            <circle cx="150" cy="850" r="150" fill="white" fillOpacity="0.03" />
            <path
              d="M -100 300 Q 150 150 400 350 T 600 200"
              stroke="white"
              strokeOpacity="0.03"
              strokeWidth="3"
            />
            <path
              d="M -100 400 Q 100 600 250 500 T 600 600"
              stroke="white"
              strokeOpacity="0.02"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="relative z-10">
          <img
            src="/logo.png"
            alt="EzXports"
            className="w-40 rounded object-contain brightness-0 invert"
          />
          <h2 className="mt-8 text-3xl font-semibold leading-tight tracking-tight">
            Manage every conversation in one place.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Review customer threads, monitor chat activity, and keep your support operations running smoothly.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
              <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-sm text-white/80">Full conversation history with search and filters</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
              <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-sm text-white/80">Real-time session and message analytics</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
              <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
            <p className="text-sm text-white/80">Secure admin-only access with API key authentication</p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center bg-[#F6F6F7] px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <img src="/logo.png" alt="EzXports" className="mx-auto w-24 rounded object-contain" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[#202223]">Admin Sign In</h1>
            <p className="mt-1 text-sm text-[#6D7175]">Enter your API key to access the dashboard.</p>
          </div>

          <form
            className="rounded-xl border border-[#E1E3E5] bg-white p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-key" className="block text-sm font-medium text-[#202223]">
                  API Key
                </label>
                <div className="relative">
                  <input
                    id="admin-key"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="off"
                    value={keyInput}
                    onChange={(event) => setKeyInput(event.target.value)}
                    placeholder="ezx_admin_••••••••"
                    className="w-full rounded border border-[#C9CCCF] bg-white py-2.5 pl-3 pr-10 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6D7175] hover:text-[#202223]"
                    tabIndex={-1}
                  >
                    {showKey ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded border border-[#E4B4B4] bg-[#FFF5F5] px-3 py-2.5 text-sm text-[#8A1F1F]">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-10 w-full items-center justify-center rounded border border-[#008060] bg-[#008060] text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:bg-[#008060] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : 'Sign in'}
              </button>
            </div>
          </form>

          <p className="mt-5 text-center text-xs text-[#6D7175]">
            Contact your team administrator for access credentials.
          </p>
        </div>
      </div>
    </div>
  )
}

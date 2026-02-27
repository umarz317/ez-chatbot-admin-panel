import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { fetchAdminStats, requestAdminOtp, verifyAdminOtp } from '../api/client'
import {
  CheckIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'

type LoginPageProps = {
  authToken: string
  onAuthenticated: (authToken: string) => void
}

type LocationState = {
  from?: {
    pathname?: string
  }
}

export function LoginPage({ authToken, onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [emailInput, setEmailInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [challengeToken, setChallengeToken] = useState('')
  const [devOtpCode, setDevOtpCode] = useState('')
  const [isRequestingOtp, setIsRequestingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null
    return state?.from?.pathname || '/conversations'
  }, [location.state])

  useEffect(() => {
    if (!authToken) {
      return
    }
    navigate(redirectTo, { replace: true })
  }, [authToken, navigate, redirectTo])

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = emailInput.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter a valid email address.')
      return
    }

    setError('')
    setInfo('')
    setIsRequestingOtp(true)
    try {
      const response = await requestAdminOtp(normalizedEmail)
      setChallengeToken(response.challenge_token)
      setDevOtpCode(response.dev_otp_code || '')
      setOtpInput('')
      setInfo(`Code sent to ${response.email}. It expires in about ${Math.ceil(response.expires_in / 60)} minutes.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request OTP'
      setError(message)
    } finally {
      setIsRequestingOtp(false)
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!challengeToken) {
      setError('Request a code first.')
      return
    }

    const normalizedOtp = otpInput.trim()
    if (!normalizedOtp) {
      setError('Enter the verification code.')
      return
    }

    setError('')
    setIsVerifyingOtp(true)
    try {
      const response = await verifyAdminOtp(emailInput.trim().toLowerCase(), normalizedOtp, challengeToken)
      const token = (response.access_token || response.token || '').trim()
      if (!token) {
        throw new Error('Authentication token missing in response')
      }
      await fetchAdminStats(token)
      onAuthenticated(token)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OTP verification failed'
      setError(message)
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[480px] shrink-0 flex-col justify-between overflow-hidden bg-[#004C3F] p-10 text-white lg:flex">
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
            <p className="text-sm text-white/80">Secure admin-only access with email OTP authentication</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#F6F6F7] px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <img src="/logo.png" alt="EzXports" className="mx-auto w-24 rounded object-contain" />
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-[#202223]">Admin Sign In</h1>
            <p className="mt-1 text-sm text-[#6D7175]">Sign in with your approved admin email and one-time code.</p>
          </div>

          <div className="rounded-xl border border-[#E1E3E5] bg-white p-6 shadow-sm">
            <form className="space-y-4" onSubmit={handleRequestOtp}>
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="block text-sm font-medium text-[#202223]">
                  Admin Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6D7175]" />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    placeholder="you@ezxports.com"
                    className="w-full rounded border border-[#C9CCCF] bg-white py-2.5 pl-9 pr-3 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRequestingOtp || !emailInput.trim()}
                className="inline-flex h-10 w-full items-center justify-center rounded border border-[#008060] bg-[#008060] text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:bg-[#008060] disabled:opacity-50"
              >
                {isRequestingOtp ? (
                  <>
                    <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : challengeToken ? 'Resend code' : 'Send code'}
              </button>
            </form>

            {challengeToken ? (
              <form className="mt-4 space-y-4 border-t border-[#E1E3E5] pt-4" onSubmit={handleVerifyOtp}>
                <div className="space-y-1.5">
                  <label htmlFor="admin-otp" className="block text-sm font-medium text-[#202223]">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6D7175]" />
                    <input
                      id="admin-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otpInput}
                      onChange={(event) => setOtpInput(event.target.value)}
                      placeholder="Enter code"
                      className="w-full rounded border border-[#C9CCCF] bg-white py-2.5 pl-9 pr-3 text-sm text-[#202223] outline-none transition focus:border-[#008060] focus:outline-2 focus:outline-offset-1 focus:outline-[#008060]"
                    />
                  </div>
                  {import.meta.env.DEV && devOtpCode ? (
                    <p className="m-0 text-xs text-[#6D7175]">Local OTP code: {devOtpCode}</p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || !otpInput.trim()}
                  className="inline-flex h-10 w-full items-center justify-center rounded border border-[#008060] bg-[#008060] text-sm font-medium text-white shadow-sm transition hover:bg-[#006E52] disabled:cursor-not-allowed disabled:bg-[#008060] disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <>
                      <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : 'Sign in'}
                </button>
              </form>
            ) : null}

            {info ? (
              <div className="mt-4 rounded border border-[#B7E4C7] bg-[#F1FBF4] px-3 py-2 text-sm text-[#065F46]">
                {info}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 flex items-start gap-2 rounded border border-[#E4B4B4] bg-[#FFF5F5] px-3 py-2.5 text-sm text-[#8A1F1F]">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>

          <p className="mt-5 text-center text-xs text-[#6D7175]">
            Contact your team administrator if your email is not approved.
          </p>
        </div>
      </div>
    </div>
  )
}

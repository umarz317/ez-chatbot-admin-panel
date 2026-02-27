import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { ApiError } from './api/client'
import { clearAdminAuthToken, getAdminAuthToken } from './auth/storage'
import './index.css'

function handleAuthFailure(error: unknown): void {
  if (!(error instanceof ApiError) || error.status !== 401) {
    return
  }
  if (!getAdminAuthToken()) {
    return
  }
  clearAdminAuthToken()
  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleAuthFailure,
  }),
  mutationCache: new MutationCache({
    onError: handleAuthFailure,
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

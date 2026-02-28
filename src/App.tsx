import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { clearAdminAuthToken, getAdminAuthToken, setAdminAuthToken } from './auth/storage'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ConversationDetailPage } from './pages/ConversationDetailPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { LoginPage } from './pages/LoginPage'
import { TicketsPage } from './pages/TicketsPage'
import { useAdminPresence } from './presence/useAdminPresence'

function App() {
  const navigate = useNavigate()
  const [authToken, setAuthToken] = useState(() => getAdminAuthToken())
  const presence = useAdminPresence(authToken)

  function handleAuthenticated(token: string) {
    setAdminAuthToken(token)
    setAuthToken(token)
  }

  function handleLogout() {
    clearAdminAuthToken()
    setAuthToken('')
    navigate('/login', { replace: true })
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage authToken={authToken} onAuthenticated={handleAuthenticated} />}
      />

      <Route element={<ProtectedRoute authToken={authToken} />}>
        <Route element={<AdminLayout onLogout={handleLogout} />}>
          <Route
            path="/conversations"
            element={<ConversationsPage apiKey={authToken} presence={presence} />}
          />
          <Route
            path="/conversations/:sessionKey"
            element={<ConversationDetailPage apiKey={authToken} presence={presence} />}
          />
          <Route
            path="/tickets"
            element={<TicketsPage apiKey={authToken} />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={authToken ? '/conversations' : '/login'} replace />}
      />
    </Routes>
  )
}

export default App

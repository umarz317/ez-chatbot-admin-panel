import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useState } from 'react'

import { clearAdminApiKey, getAdminApiKey, setAdminApiKey } from './auth/storage'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ConversationDetailPage } from './pages/ConversationDetailPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { LoginPage } from './pages/LoginPage'
import { useAdminPresence } from './presence/useAdminPresence'

function App() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState(() => getAdminApiKey())
  const presence = useAdminPresence(apiKey)

  function handleAuthenticated(key: string) {
    setAdminApiKey(key)
    setApiKey(key)
  }

  function handleLogout() {
    clearAdminApiKey()
    setApiKey('')
    navigate('/login', { replace: true })
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage apiKey={apiKey} onAuthenticated={handleAuthenticated} />}
      />

      <Route element={<ProtectedRoute apiKey={apiKey} />}>
        <Route element={<AdminLayout onLogout={handleLogout} />}>
          <Route
            path="/conversations"
            element={<ConversationsPage apiKey={apiKey} presence={presence} />}
          />
          <Route
            path="/conversations/:sessionKey"
            element={<ConversationDetailPage apiKey={apiKey} presence={presence} />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={apiKey ? '/conversations' : '/login'} replace />}
      />
    </Routes>
  )
}

export default App

import { Navigate, Outlet, useLocation } from 'react-router-dom'

type ProtectedRouteProps = {
  apiKey: string
}

export function ProtectedRoute({ apiKey }: ProtectedRouteProps) {
  const location = useLocation()
  if (!apiKey) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

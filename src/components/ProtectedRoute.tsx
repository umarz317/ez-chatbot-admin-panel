import { Navigate, Outlet, useLocation } from 'react-router-dom'

type ProtectedRouteProps = {
  authToken: string
}

export function ProtectedRoute({ authToken }: ProtectedRouteProps) {
  const location = useLocation()
  if (!authToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

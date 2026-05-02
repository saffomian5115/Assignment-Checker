import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Full spinner while auth loads
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
    </div>
  )
}

// Protect any route — redirect to /login if not authenticated
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  return children
}

// Only allow a specific role
export function RoleRoute({ children, role }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  if (user?.role !== role) {
    // Redirect to their own dashboard
    const redirect = user?.role === 'teacher' ? '/teacher' : '/student'
    return <Navigate to={redirect} replace />
  }

  return children
}
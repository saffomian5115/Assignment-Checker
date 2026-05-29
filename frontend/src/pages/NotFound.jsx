import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const homeLink = user
    ? user.role === 'teacher' ? '/teacher' : '/student'
    : '/login'

  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      background: 'var(--bg)',
      textAlign: 'center',
      padding: '24px',
    }}>
      <div style={{ fontSize: '4rem', lineHeight: 1 }}>404</div>
      <h2 style={{ color: 'var(--text-h)', fontSize: '1.4rem', fontWeight: 600 }}>
        Page not found
      </h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '320px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Go back</button>
        <Link className="btn btn-primary" to={homeLink}>Home</Link>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './Navbar.css'

export default function Navbar({ links = [] }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to={user?.role === 'teacher' ? '/teacher' : '/student'} className="navbar-logo">
          <span className="navbar-logo-icon">✦</span>
          <span className="navbar-logo-text">AssignChecker</span>
        </Link>

        {/* Desktop links */}
        <div className="navbar-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link ${location.pathname === link.to ? 'active' : ''}`}
            >
              {link.icon && <span className="navbar-link-icon">{link.icon}</span>}
              {link.label}
            </Link>
          ))}
        </div>

        {/* User info + logout */}
        <div className="navbar-right">
          <div className="navbar-user">
            <div className="navbar-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user?.name}</span>
              <span className={`navbar-role-badge ${user?.role}`}>{user?.role}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm navbar-logout" onClick={handleLogout}>
            Sign out
          </button>

          {/* Mobile hamburger */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`ham-line ${menuOpen ? 'open' : ''}`} />
            <span className={`ham-line ${menuOpen ? 'open' : ''}`} />
            <span className={`ham-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`mobile-link ${location.pathname === link.to ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.icon} {link.label}
            </Link>
          ))}
          <button className="mobile-link mobile-logout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}

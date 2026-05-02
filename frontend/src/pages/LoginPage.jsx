import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { login as loginApi } from '../api/auth'
import './AuthPages.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await loginApi(data)
      const { access_token, user } = res.data
      login(access_token, user)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      const redirect = from || (user.role === 'teacher' ? '/teacher' : '/student')
      navigate(redirect, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid email or password'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-container">
        {/* Left — branding */}
        <div className="auth-brand">
          <div className="auth-brand-inner">
            <div className="brand-logo">
              <span className="brand-icon">✦</span>
            </div>
            <h1 className="brand-title">Assignment<br />Checker</h1>
            <p className="brand-sub">
              AI-powered grading with grammar analysis,
              plagiarism detection &amp; content evaluation.
            </p>
            <div className="brand-stats">
              <div className="brand-stat">
                <span className="brand-stat-val">3×</span>
                <span className="brand-stat-label">Faster grading</span>
              </div>
              <div className="brand-stat">
                <span className="brand-stat-val">99%</span>
                <span className="brand-stat-label">Accuracy</span>
              </div>
              <div className="brand-stat">
                <span className="brand-stat-val">Free</span>
                <span className="brand-stat-label">&amp; local</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="auth-panel">
          <div className="auth-card fade-in">
            <div className="auth-header">
              <h2 className="auth-title">Sign in</h2>
              <p className="auth-desc">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email',
                    },
                  })}
                />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Minimum 6 characters' },
                  })}
                />
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg auth-submit"
                disabled={loading}
              >
                {loading ? <><span className="btn-spinner" />Signing in…</> : 'Sign in →'}
              </button>
            </form>

            <div className="auth-footer">
              <span>Don't have an account?</span>
              <Link to="/register" className="auth-link">Create one</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

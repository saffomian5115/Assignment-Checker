import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { register as registerApi } from '../api/auth'
import './AuthPages.css'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('student')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { role: 'student' } })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await registerApi({ ...data, role })
      const { access_token, user } = res.data
      login(access_token, user)
      toast.success(`Account created! Welcome, ${user.name.split(' ')[0]}!`)
      navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed'
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
            <h1 className="brand-title">Join the<br />Platform</h1>
            <p className="brand-sub">
              Create your account to start submitting
              or grading assignments with AI assistance.
            </p>
            <div className="brand-roles">
              <div className="brand-role-item">
                <span className="brand-role-icon">🎓</span>
                <div>
                  <strong>Students</strong>
                  <p>Submit assignments, get instant AI feedback on grammar, plagiarism &amp; content.</p>
                </div>
              </div>
              <div className="brand-role-item">
                <span className="brand-role-icon">📋</span>
                <div>
                  <strong>Teachers</strong>
                  <p>Review class submissions, override grades, and track student progress.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="auth-panel">
          <div className="auth-card fade-in">
            <div className="auth-header">
              <h2 className="auth-title">Create account</h2>
              <p className="auth-desc">Fill in your details to get started</p>
            </div>

            {/* Role toggle */}
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                <span>🎓</span> Student
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'teacher' ? 'active' : ''}`}
                onClick={() => setRole('teacher')}
              >
                <span>📋</span> Teacher
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Ali Hassan"
                  autoComplete="name"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: { value: 2, message: 'At least 2 characters' },
                    maxLength: { value: 100, message: 'Max 100 characters' },
                  })}
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
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
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
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
                {loading
                  ? <><span className="btn-spinner" />Creating account…</>
                  : `Create ${role} account →`}
              </button>
            </form>

            <div className="auth-footer">
              <span>Already have an account?</span>
              <Link to="/login" className="auth-link">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

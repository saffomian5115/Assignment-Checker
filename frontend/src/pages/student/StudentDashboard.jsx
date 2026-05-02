import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyAssignments } from '../../api/assignments'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'
import './StudentPages.css'

const NAV_LINKS = [
  { to: '/student', label: 'My Assignments', icon: '📄' },
  { to: '/student/submit', label: 'Submit', icon: '⬆️' },
]

function StatusBadge({ status }) {
  const map = {
    pending: { cls: 'badge-pending', label: 'Pending' },
    checking: { cls: 'badge-checking', label: 'Checking…' },
    done: { cls: 'badge-done', label: 'Done' },
    error: { cls: 'badge-error', label: 'Error' },
  }
  const { cls, label } = map[status] || { cls: 'badge-pending', label: status }
  return <span className={`badge ${cls}`}>{label}</span>
}

function GradeBadge({ grade }) {
  if (!grade) return <span className="text-muted">—</span>
  return <span className={`grade-chip grade-${grade}`}>{grade}</span>
}

function ScoreBar({ score }) {
  if (score == null) return <span className="text-muted">—</span>
  const pct = (score / 10) * 100
  const color = score >= 7 ? 'var(--green)' : score >= 5 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div className="score-bar-wrap">
      <span className="score-bar-val">{score.toFixed(1)}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, accent }) {
  return (
    <div className="stat-card" style={accent ? { '--accent-local': accent } : {}}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={accent ? { color: accent } : {}}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await getMyAssignments()
      setAssignments(res.data)
    } catch {
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Poll every 5s if any assignment is still being checked
  useEffect(() => {
    const hasChecking = assignments.some(
      (a) => a.status === 'checking' || a.status === 'pending'
    )
    if (!hasChecking) return

    const interval = setInterval(fetchAssignments, 5000)
    return () => clearInterval(interval)
  }, [assignments, fetchAssignments])

  // Stats
  const done = assignments.filter((a) => a.status === 'done')
  const avgScore =
    done.length > 0
      ? (done.reduce((s, a) => s + (a.final_score || 0), 0) / done.length).toFixed(1)
      : '—'
  const plagCount = done.filter((a) => a.is_plagiarized).length

  return (
    <div className="page">
      <Navbar links={NAV_LINKS} />

      <div className="page-content fade-in">
        {/* Page header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              My Assignments
            </h1>
            <p className="page-subtitle">
              Track your submissions and results, {user?.name?.split(' ')[0]}.
            </p>
          </div>
          <Link to="/student/submit" className="btn btn-primary">
            ⬆️ Submit assignment
          </Link>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <StatCard icon="📄" value={assignments.length} label="Total submitted" />
          <StatCard icon="✅" value={done.length} label="Graded" accent="var(--green)" />
          <StatCard icon="⭐" value={avgScore} label="Avg score" accent="var(--accent-2)" />
          <StatCard icon="⚠️" value={plagCount} label="Plagiarism flags" accent={plagCount > 0 ? 'var(--red)' : undefined} />
        </div>

        {/* Assignments table */}
        {loading ? (
          <div className="table-skeleton">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No assignments yet</h3>
            <p>Submit your first assignment to get AI-powered feedback.</p>
            <Link to="/student/submit" className="btn btn-primary">
              Submit assignment
            </Link>
          </div>
        ) : (
          <div className="table-wrap slide-in">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Words</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="table-row">
                    <td>
                      <span className="assignment-title">{a.title}</span>
                    </td>
                    <td>
                      <span className="subject-tag">{a.subject}</span>
                    </td>
                    <td className="text-muted">{a.word_count?.toLocaleString()}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td>
                      <ScoreBar score={a.final_score} />
                    </td>
                    <td>
                      <GradeBadge grade={a.teacher_grade || a.grade} />
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(a.created_at).toLocaleDateString('en-PK', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      {a.status === 'done' ? (
                        <Link
                          to={`/student/result/${a.id}`}
                          className="btn btn-sm btn-secondary"
                        >
                          View result →
                        </Link>
                      ) : a.status === 'checking' || a.status === 'pending' ? (
                        <span className="checking-indicator">
                          <span className="checking-dot" />
                          Processing…
                        </span>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

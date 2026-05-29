import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAllAssignments, getAnalyticsOverview } from '../../api/assignments'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import './TeacherPages.css'

const NAV_LINKS = [
  { to: '/teacher', label: 'Dashboard', icon: '📊' },
]

/* ── Metric Card ─────────────────────────────────── */
function MetricCard({ icon, value, label, sub, accent, delay = 0 }) {
  return (
    <div
      className="metric-card fade-in"
      style={{ animationDelay: `${delay}s`, '--accent-local': accent }}
    >
      <div className="metric-top">
        <span className="metric-icon" style={{ background: accent + '22', color: accent }}>
          {icon}
        </span>
        <div className="metric-trend" />
      </div>
      <div className="metric-value" style={{ color: accent }}>{value}</div>
      <div className="metric-label">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

/* ── Status badge ────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    pending:  { cls: 'badge-pending',  label: 'Pending' },
    checking: { cls: 'badge-checking', label: 'Checking…' },
    done:     { cls: 'badge-done',     label: 'Done' },
    error:    { cls: 'badge-error',    label: 'Error' },
  }
  const { cls, label } = map[status] || { cls: 'badge-pending', label: status }
  return <span className={`badge ${cls}`}>{label}</span>
}

/* ── Grade chip ──────────────────────────────────── */
function GradeChip({ grade }) {
  if (!grade) return <span className="text-muted">—</span>
  return <span className={`grade-chip grade-${grade}`}>{grade}</span>
}

/* ── Score bar ───────────────────────────────────── */
function ScoreBar({ score }) {
  if (score == null) return <span className="text-muted">—</span>
  const pct = (score / 10) * 100
  const color =
    score >= 7 ? 'var(--green)' : score >= 5 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div className="score-bar-wrap">
      <span className="score-bar-val">{score.toFixed(1)}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

/* ── Custom bar chart tooltip ────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">Grade {label}</div>
      <div className="chart-tooltip-val">{payload[0].value} submission{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────── */
export default function TeacherDashboard() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterFlag, setFilterFlag]     = useState('all')
  const [sortBy, setSortBy]   = useState('date_desc')

  const fetchData = useCallback(async () => {
    try {
      const [aRes, ovRes] = await Promise.all([
        getAllAssignments(),
        getAnalyticsOverview(),
      ])
      setAssignments(aRes.data)
      setAnalytics(ovRes.data)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll every 8s if anything still checking
  useEffect(() => {
    const hasActive = assignments.some(
      (a) => a.status === 'checking' || a.status === 'pending'
    )
    if (!hasActive) return
    const id = setInterval(fetchData, 8000)
    return () => clearInterval(id)
  }, [assignments, fetchData])

  /* ── Derived stats ── */
  const done      = assignments.filter((a) => a.status === 'done')
  const pending   = assignments.filter((a) => a.status === 'pending' || a.status === 'checking')
  const plagCount = done.filter((a) => a.is_plagiarized).length
  const avgScore  = analytics?.average_score ?? (
    done.length
      ? (done.reduce((s, a) => s + (a.final_score || 0), 0) / done.length).toFixed(1)
      : 0
  )

  /* ── Grade distribution chart data ── */
  const GRADE_COLORS = {
    A: 'var(--green)',
    B: 'var(--blue)',
    C: 'var(--yellow)',
    D: '#f97316',
    F: 'var(--red)',
  }
  const gradeData = ['A', 'B', 'C', 'D', 'F'].map((g) => ({
    grade: g,
    count: analytics?.grade_distribution?.[g] ?? 0,
    color: GRADE_COLORS[g],
  }))

  /* ── Filter + sort ── */
  const filtered = assignments
    .filter((a) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        a.title?.toLowerCase().includes(q) ||
        a.student_name?.toLowerCase().includes(q) ||
        a.subject?.toLowerCase().includes(q)
      const matchStatus =
        filterStatus === 'all' || a.status === filterStatus
      const matchFlag =
        filterFlag === 'all' ||
        (filterFlag === 'plagiarized' && a.is_plagiarized) ||
        (filterFlag === 'clean' && !a.is_plagiarized)
      return matchSearch && matchStatus && matchFlag
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':  return new Date(a.created_at) - new Date(b.created_at)
        case 'date_desc': return new Date(b.created_at) - new Date(a.created_at)
        case 'score_desc': return (b.final_score ?? -1) - (a.final_score ?? -1)
        case 'score_asc':  return (a.final_score ?? 99) - (b.final_score ?? 99)
        case 'name':       return a.student_name?.localeCompare(b.student_name)
        default: return 0
      }
    })

  return (
    <div className="page">
      <Navbar links={NAV_LINKS} />

      <div className="page-content">

        {/* ── Header ── */}
        <div className="page-header fade-in">
          <div>
            <h1 className="page-title">Teacher Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {user?.name?.split(' ')[0]}. Here's your class overview.
            </p>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost btn-sm" onClick={fetchData}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ── Metric cards ── */}
        {loading ? (
          <div className="metrics-row">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />
            ))}
          </div>
        ) : (
          <div className="metrics-row">
            <MetricCard
              icon="📄"
              value={assignments.length}
              label="Total Submissions"
              sub={`${done.length} graded`}
              accent="var(--accent-2)"
              delay={0}
            />
            <MetricCard
              icon="⭐"
              value={typeof avgScore === 'number' ? avgScore.toFixed(1) : avgScore}
              label="Average Score"
              sub="out of 10"
              accent="var(--blue)"
              delay={0.05}
            />
            <MetricCard
              icon="⚠️"
              value={plagCount}
              label="Plagiarism Cases"
              sub={plagCount > 0 ? 'Needs review' : 'All clear'}
              accent={plagCount > 0 ? 'var(--red)' : 'var(--green)'}
              delay={0.1}
            />
            <MetricCard
              icon="⏳"
              value={pending.length}
              label="Pending / Checking"
              sub={pending.length > 0 ? 'Processing…' : 'All done'}
              accent="var(--yellow)"
              delay={0.15}
            />
          </div>
        )}

        {/* ── Analytics row: chart + quick stats ── */}
        {!loading && (
          <div className="analytics-row fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Grade distribution bar chart */}
            <div className="card chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Grade Distribution</h3>
                <p className="chart-sub">{done.length} graded assignment{done.length !== 1 ? 's' : ''}</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gradeData} barSize={36} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="grade"
                    tick={{ fill: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-3)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {gradeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick breakdown */}
            <div className="card breakdown-card">
              <h3 className="chart-title" style={{ marginBottom: 16 }}>Score Breakdown</h3>
              <div className="breakdown-rows">
                {[
                  { label: 'Excellent  (A)', count: analytics?.grade_distribution?.A ?? 0, color: 'var(--green)', range: '9–10' },
                  { label: 'Good  (B)',      count: analytics?.grade_distribution?.B ?? 0, color: 'var(--blue)',  range: '7–8.9' },
                  { label: 'Average  (C)',   count: analytics?.grade_distribution?.C ?? 0, color: 'var(--yellow)',range: '5–6.9' },
                  { label: 'Poor  (D)',      count: analytics?.grade_distribution?.D ?? 0, color: '#f97316',      range: '3–4.9' },
                  { label: 'Fail  (F)',      count: analytics?.grade_distribution?.F ?? 0, color: 'var(--red)',   range: '< 3' },
                ].map((row) => {
                  const total = done.length || 1
                  const pct = Math.round((row.count / total) * 100)
                  return (
                    <div key={row.label} className="breakdown-row">
                      <div className="breakdown-meta">
                        <span className="breakdown-label">{row.label}</span>
                        <span className="breakdown-range">{row.range}</span>
                      </div>
                      <div className="breakdown-bar-track">
                        <div
                          className="breakdown-bar-fill"
                          style={{ width: `${pct}%`, background: row.color }}
                        />
                      </div>
                      <span className="breakdown-count" style={{ color: row.color }}>
                        {row.count}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Plagiarism summary */}
              <div className="plagiarism-summary">
                <div className="plag-item">
                  <span className="plag-dot" style={{ background: 'var(--red)' }} />
                  <span>{plagCount} plagiarized</span>
                </div>
                <div className="plag-item">
                  <span className="plag-dot" style={{ background: 'var(--green)' }} />
                  <span>{done.length - plagCount} original</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Table controls ── */}
        <div className="table-controls fade-in" style={{ animationDelay: '0.25s' }}>
          <div className="table-controls-left">
            <h3 className="table-title">All Submissions</h3>
            <span className="table-count">{filtered.length} of {assignments.length}</span>
          </div>
          <div className="table-controls-right">
            <input
              className="form-input search-input"
              placeholder="Search student, title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-select filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="done">Done</option>
              <option value="checking">Checking</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
            </select>
            <select
              className="form-select filter-select"
              value={filterFlag}
              onChange={(e) => setFilterFlag(e.target.value)}
            >
              <option value="all">All</option>
              <option value="plagiarized">Plagiarized</option>
              <option value="clean">Clean</option>
            </select>
            <select
              className="form-select filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="score_desc">Highest score</option>
              <option value="score_asc">Lowest score</option>
              <option value="name">Student A–Z</option>
            </select>
          </div>
        </div>

        {/* ── Assignments table ── */}
        {loading ? (
          <div className="table-skeleton">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No assignments found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="table-wrap slide-in">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Flag</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => (
                  <tr
                    key={a.id}
                    className={`table-row ${a.is_plagiarized ? 'row-plagiarized' : ''}`}
                    style={{ animationDelay: `${idx * 0.03}s` }}
                  >
                    {/* Student */}
                    <td>
                      <div className="student-cell">
                        <div className="student-avatar">
                          {a.student_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="student-name">{a.student_name}</span>
                      </div>
                    </td>

                    {/* Title */}
                    <td>
                      <span className="assignment-title">{a.title}</span>
                      <span className="word-count-hint">{a.word_count?.toLocaleString()} words</span>
                    </td>

                    {/* Subject */}
                    <td><span className="subject-tag">{a.subject}</span></td>

                    {/* Status */}
                    <td><StatusBadge status={a.status} /></td>

                    {/* Score */}
                    <td><ScoreBar score={a.final_score} /></td>

                    {/* Grade */}
                    <td><GradeChip grade={a.teacher_grade || a.grade} /></td>

                    {/* Plagiarism flag */}
                    <td>
                      {a.is_plagiarized ? (
                        <span className="plag-flag">🚨 Flagged</span>
                      ) : a.status === 'done' ? (
                        <span className="clean-flag">✅ Clean</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="text-muted text-sm">
                      {new Date(a.created_at).toLocaleDateString('en-PK', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>

                    {/* Action */}
                    <td>
                      {a.status === 'done' ? (
                        <Link
                          to={`/teacher/assignment/${a.id}`}
                          className="btn btn-sm btn-secondary"
                        >
                          Review →
                        </Link>
                      ) : (a.status === 'checking' || a.status === 'pending') ? (
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

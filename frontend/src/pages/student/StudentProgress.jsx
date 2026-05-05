import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyProgress } from '../../api/assignments'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import './StudentPages.css'
import './StudentProgress.css'

const NAV_LINKS = [
  { to: '/student', label: 'My Assignments', icon: '📄' },
  { to: '/student/submit', label: 'Submit', icon: '⬆️' },
  { to: '/student/progress', label: 'Progress', icon: '📈' },
]

/* ── Custom Tooltip ─────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="prog-tooltip">
      <div className="prog-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="prog-tooltip-row">
          <span className="prog-tooltip-dot" style={{ background: p.color }} />
          <span className="prog-tooltip-name">{p.name}</span>
          <span className="prog-tooltip-val">{Number(p.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Trend Arrow ─────────────────────────────────────── */
function Trend({ current, previous }) {
  if (!previous) return null
  const diff = current - previous
  if (Math.abs(diff) < 0.1) return <span className="trend-flat">→ Stable</span>
  return diff > 0
    ? <span className="trend-up">↑ +{diff.toFixed(1)}</span>
    : <span className="trend-down">↓ {diff.toFixed(1)}</span>
}

/* ── Stat Ring ───────────────────────────────────────── */
function StatRing({ value, max = 10, color, size = 80, stroke = 7, label, sub }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min((value || 0) / max, 1)
  return (
    <div className="prog-ring-wrap">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={`${pct * circ} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="prog-ring-inner" style={{ width: size, height: size }}>
          <span className="prog-ring-val" style={{ color }}>{value?.toFixed(1)}</span>
        </div>
      </div>
      <span className="prog-ring-label">{label}</span>
      {sub && <span className="prog-ring-sub">{sub}</span>}
    </div>
  )
}

/* ── Grade Timeline Item ────────────────────────────── */
function TimelineItem({ item, index, total }) {
  const gradeColors = { A: 'var(--green)', B: 'var(--blue)', C: 'var(--yellow)', D: 'var(--red)', F: 'var(--red)' }
  const color = gradeColors[item.grade] || 'var(--text-muted)'
  const isLast = index === total - 1

  return (
    <div className="timeline-item fade-in" style={{ animationDelay: `${index * 0.06}s` }}>
      <div className="timeline-left">
        <div className="timeline-grade" style={{ color, borderColor: color + '44', background: color + '11' }}>
          {item.grade}
        </div>
        {!isLast && <div className="timeline-line" />}
      </div>
      <div className="timeline-card">
        <div className="timeline-card-top">
          <div>
            <span className="timeline-score" style={{ color }}>{item.final_score?.toFixed(2)}</span>
            <span className="timeline-score-max">/10</span>
          </div>
          <span className="timeline-date">
            {new Date(item.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="timeline-scores">
          <span className="timeline-score-chip" style={{ color: 'var(--blue)' }}>
            📝 {item.grammar_score?.toFixed(1)}
          </span>
          <span className="timeline-score-chip" style={{ color: 'var(--accent-2)' }}>
            🧠 {item.content_score?.toFixed(1)}
          </span>
          <span className="timeline-score-chip" style={{ color: 'var(--green)' }}>
            ✅ {item.plagiarism_score?.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────── */
export default function StudentProgress() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    getMyProgress()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page">
        <Navbar links={NAV_LINKS} />
        <div className="page-content">
          <div className="prog-skeleton-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--r-lg)', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.submissions === 0) {
    return (
      <div className="page">
        <Navbar links={NAV_LINKS} />
        <div className="page-content fade-in">
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-icon">📊</div>
            <h3>No progress yet</h3>
            <p>Submit your first assignment to start tracking your progress.</p>
            <Link to="/student/submit" className="btn btn-primary">Submit assignment</Link>
          </div>
        </div>
      </div>
    )
  }

  const { submissions, average_score, best_score, progress = [] } = data

  // Chart data
  const chartData = progress.map((p, i) => ({
    name: `#${i + 1}`,
    'Final Score': +p.final_score?.toFixed(2),
    'Grammar': +p.grammar_score?.toFixed(2),
    'Content': +p.content_score?.toFixed(2),
    'Originality': +p.plagiarism_score?.toFixed(2),
    date: new Date(p.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
  }))

  // Grade distribution
  const gradeDist = ['A', 'B', 'C', 'D', 'F'].map(g => ({
    grade: g,
    count: progress.filter(p => p.grade === g).length,
    color: { A: 'var(--green)', B: 'var(--blue)', C: 'var(--yellow)', D: 'var(--red)', F: 'var(--red)' }[g],
  }))

  // Avg sub-scores
  const avgGrammar = progress.length ? progress.reduce((s, p) => s + (p.grammar_score || 0), 0) / progress.length : 0
  const avgContent = progress.length ? progress.reduce((s, p) => s + (p.content_score || 0), 0) / progress.length : 0
  const avgOriginality = progress.length ? progress.reduce((s, p) => s + (p.plagiarism_score || 0), 0) / progress.length : 0

  const radarData = [
    { subject: 'Grammar', value: +avgGrammar.toFixed(1) },
    { subject: 'Content', value: +avgContent.toFixed(1) },
    { subject: 'Originality', value: +avgOriginality.toFixed(1) },
    { subject: 'Avg Score', value: +average_score?.toFixed(1) },
  ]

  const latest = progress[progress.length - 1]
  const prev = progress[progress.length - 2]

  // Consistency score (lower std dev = higher consistency)
  const scores = progress.map(p => p.final_score)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const stdDev = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length)
  const consistency = Math.max(0, 10 - stdDev * 2).toFixed(1)

  return (
    <div className="page">
      <Navbar links={NAV_LINKS} />

      <div className="page-content fade-in">

        {/* ── Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">My Progress</h1>
            <p className="page-subtitle">
              Track your performance across {submissions} submission{submissions !== 1 ? 's' : ''}, {user?.name?.split(' ')[0]}.
            </p>
          </div>
          <Link to="/student/submit" className="btn btn-primary">⬆️ New submission</Link>
        </div>

        {/* ── Hero stats ── */}
        <div className="prog-hero card">
          <div className="prog-hero-rings">
            <StatRing value={average_score} color="var(--accent-2)" size={96} label="Avg Score" sub="out of 10" />
            <StatRing value={best_score} color="var(--green)" size={96} label="Best Score" sub="personal best" />
            <StatRing value={+avgGrammar.toFixed(1)} color="var(--blue)" size={80} label="Grammar" />
            <StatRing value={+avgContent.toFixed(1)} color="var(--accent-2)" size={80} label="Content" />
            <StatRing value={+avgOriginality.toFixed(1)} color="var(--green)" size={80} label="Originality" />
            <StatRing value={+consistency} color="var(--yellow)" size={80} label="Consistency" />
          </div>

          {/* Latest vs previous */}
          {latest && (
            <div className="prog-hero-latest">
              <span className="prog-latest-label">Latest result</span>
              <div className="prog-latest-score">
                <span style={{ color: 'var(--text-h)', fontSize: '1.8rem', fontWeight: 800 }}>
                  {latest.final_score?.toFixed(2)}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>/10</span>
              </div>
              <Trend current={latest.final_score} previous={prev?.final_score} />
              <span className={`grade-chip grade-${latest.grade}`} style={{ marginTop: 6 }}>
                {latest.grade}
              </span>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="prog-tabs">
          {['overview', 'breakdown', 'timeline'].map(tab => (
            <button
              key={tab}
              className={`prog-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {{ overview: '📈 Overview', breakdown: '🧩 Breakdown', timeline: '📋 Timeline' }[tab]}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="prog-tab-content fade-in">
            {/* Score trend area chart */}
            <div className="card prog-chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Score Trend</h3>
                <p className="chart-sub">Your final score across all submissions</p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-2)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--accent-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Final Score" stroke="var(--accent-2)" strokeWidth={2.5}
                    fill="url(#scoreGrad)" dot={{ fill: 'var(--accent-2)', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Multi-line chart */}
            <div className="card prog-chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Sub-scores Over Time</h3>
                <p className="chart-sub">Grammar, Content &amp; Originality trends</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="Grammar" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Content" stroke="var(--accent-2)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Originality" stroke="var(--green)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="prog-legend">
                <span style={{ color: 'var(--blue)' }}>● Grammar</span>
                <span style={{ color: 'var(--accent-2)' }}>● Content</span>
                <span style={{ color: 'var(--green)' }}>● Originality</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Breakdown Tab ── */}
        {activeTab === 'breakdown' && (
          <div className="prog-tab-content fade-in">
            <div className="prog-breakdown-grid">
              {/* Radar */}
              <div className="card">
                <h3 className="chart-title" style={{ marginBottom: 4 }}>Skills Radar</h3>
                <p className="chart-sub" style={{ marginBottom: 8 }}>Average performance by category</p>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Radar name="Avg" dataKey="value" stroke="var(--accent-2)" fill="var(--accent-2)" fillOpacity={0.15} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={v => [`${v}/10`]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Grade distribution */}
              <div className="card">
                <h3 className="chart-title" style={{ marginBottom: 4 }}>Grade Distribution</h3>
                <p className="chart-sub" style={{ marginBottom: 8 }}>How your grades have spread</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={gradeDist} barSize={32} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="grade" tick={{ fill: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={v => [`${v} submission${v !== 1 ? 's' : ''}`]} cursor={{ fill: 'var(--bg-3)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {gradeDist.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Score breakdown bars */}
              <div className="card prog-score-breakdown">
                <h3 className="chart-title" style={{ marginBottom: 16 }}>Average Sub-scores</h3>
                {[
                  { label: 'Grammar', value: avgGrammar, color: 'var(--blue)', icon: '📝', weight: '30%' },
                  { label: 'Content', value: avgContent, color: 'var(--accent-2)', icon: '🧠', weight: '50%' },
                  { label: 'Originality', value: avgOriginality, color: 'var(--green)', icon: '✅', weight: '20%' },
                ].map(row => (
                  <div key={row.label} className="prog-score-row">
                    <div className="prog-score-meta">
                      <span className="prog-score-icon">{row.icon}</span>
                      <div>
                        <span className="prog-score-label">{row.label}</span>
                        <span className="prog-score-weight">Weight: {row.weight}</span>
                      </div>
                    </div>
                    <div className="prog-score-bar-track">
                      <div className="prog-score-bar-fill" style={{ width: `${(row.value / 10) * 100}%`, background: row.color }} />
                    </div>
                    <span className="prog-score-val" style={{ color: row.color }}>{row.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="card prog-summary">
                <h3 className="chart-title" style={{ marginBottom: 16 }}>Summary</h3>
                {[
                  { label: 'Total Submissions', value: submissions, icon: '📄' },
                  { label: 'Average Score', value: average_score?.toFixed(2) + '/10', icon: '⭐', color: 'var(--accent-2)' },
                  { label: 'Best Score', value: best_score?.toFixed(2) + '/10', icon: '🏆', color: 'var(--green)' },
                  { label: 'Consistency', value: consistency + '/10', icon: '🎯', color: 'var(--yellow)' },
                  { label: 'Plagiarism Cases', value: progress.filter(p => p.grade === 'F').length, icon: '⚠️', color: 'var(--red)' },
                ].map(row => (
                  <div key={row.label} className="prog-summary-row">
                    <span className="prog-summary-icon">{row.icon}</span>
                    <span className="prog-summary-label">{row.label}</span>
                    <span className="prog-summary-val" style={row.color ? { color: row.color } : {}}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Timeline Tab ── */}
        {activeTab === 'timeline' && (
          <div className="prog-tab-content fade-in">
            <div className="prog-timeline-wrap">
              <div className="prog-timeline">
                {[...progress].reverse().map((item, i) => (
                  <TimelineItem key={item.assignment_id} item={item} index={i} total={progress.length} />
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

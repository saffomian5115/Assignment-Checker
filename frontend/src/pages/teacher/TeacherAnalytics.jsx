import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAllAssignments, getAnalyticsOverview, getStudentAnalytics } from '../../api/assignments'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import './TeacherPages.css'
import './TeacherAnalytics.css'

const NAV_LINKS = [
  { to: '/teacher', label: 'Dashboard', icon: '📊' },
  { to: '/teacher/analytics', label: 'Analytics', icon: '🔬' },
]

/* ── Tooltip ─────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="analytics-tooltip-row">
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.color, marginRight: 6 }} />
          <span style={{ color: 'var(--text)', marginRight: 4 }}>{p.name}:</span>
          <span style={{ color: 'var(--text-h)', fontWeight: 700 }}>{Number(p.value).toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Student row in table ────────────────────────── */
function StudentRow({ student, onSelect, selected }) {
  const gradeColor = { A: 'var(--green)', B: 'var(--blue)', C: 'var(--yellow)', D: 'var(--red)', F: 'var(--red)' }
  const topGrade = student.grades[0] || '—'
  return (
    <tr
      className={`table-row analytics-student-row ${selected ? 'selected-row' : ''}`}
      onClick={() => onSelect(student.id)}
      style={{ cursor: 'pointer' }}
    >
      <td>
        <div className="student-cell">
          <div className="student-avatar">{student.name?.charAt(0).toUpperCase()}</div>
          <span className="student-name">{student.name}</span>
        </div>
      </td>
      <td><span className="analytics-count-badge">{student.submissions}</span></td>
      <td>
        <div className="score-bar-wrap">
          <span className="score-bar-val">{student.avgScore?.toFixed(1)}</span>
          <div className="score-bar-track">
            <div className="score-bar-fill" style={{
              width: `${(student.avgScore / 10) * 100}%`,
              background: student.avgScore >= 7 ? 'var(--green)' : student.avgScore >= 5 ? 'var(--yellow)' : 'var(--red)'
            }} />
          </div>
        </div>
      </td>
      <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>{student.avgGrammar?.toFixed(1)}</span></td>
      <td><span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>{student.avgContent?.toFixed(1)}</span></td>
      <td>
        {student.plagCount > 0
          ? <span className="plag-flag">🚨 {student.plagCount}</span>
          : <span className="clean-flag">✅ Clean</span>
        }
      </td>
      <td>
        <span className={`grade-chip grade-${topGrade}`}>{topGrade}</span>
      </td>
    </tr>
  )
}

/* ── Student Detail Panel ────────────────────────── */
function StudentDetail({ studentId, allAssignments, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    getStudentAnalytics(studentId)
      .then(res => setDetail(res.data))
      .catch(() => toast.error('Failed to load student data'))
      .finally(() => setLoading(false))
  }, [studentId])

  if (loading) return (
    <div className="analytics-panel card">
      <div className="skeleton" style={{ height: 40, marginBottom: 16 }} />
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 8 }} />)}
    </div>
  )

  if (!detail || detail.submissions === 0) return (
    <div className="analytics-panel card">
      <button className="analytics-panel-close" onClick={onClose}>✕</button>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No graded submissions yet.</p>
    </div>
  )

  const { average_final_score, average_grammar_score, average_content_score, results = [] } = detail
  const studentName = allAssignments.find(a => a.student_id === studentId)?.student_name || 'Student'

  const trendData = results.map((r, i) => ({
    name: `#${i + 1}`,
    Score: +r.final_score?.toFixed(2),
  }))

  const radarData = [
    { subject: 'Grammar', value: +average_grammar_score?.toFixed(1) },
    { subject: 'Content', value: +average_content_score?.toFixed(1) },
    { subject: 'Avg Score', value: +average_final_score?.toFixed(1) },
  ]

  return (
    <div className="analytics-panel card fade-in">
      <div className="analytics-panel-header">
        <div className="student-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
          {studentName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 style={{ color: 'var(--text-h)', fontSize: '1rem', fontWeight: 600 }}>{studentName}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{detail.submissions} submission{detail.submissions !== 1 ? 's' : ''}</span>
        </div>
        <button className="analytics-panel-close" onClick={onClose}>✕</button>
      </div>

      {/* Mini stats */}
      <div className="analytics-panel-stats">
        {[
          { label: 'Avg Score', value: average_final_score?.toFixed(1), color: 'var(--accent-2)' },
          { label: 'Grammar', value: average_grammar_score?.toFixed(1), color: 'var(--blue)' },
          { label: 'Content', value: average_content_score?.toFixed(1), color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} className="analytics-mini-stat">
            <span className="analytics-mini-val" style={{ color: s.color }}>{s.value}</span>
            <span className="analytics-mini-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Score trend */}
      {trendData.length > 1 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score Trend</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-2)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="Score" stroke="var(--accent-2)" strokeWidth={2} fill="url(#panelGrad)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Radar */}
      <div style={{ marginTop: 8 }}>
        <ResponsiveContainer width="100%" height={160}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <Radar dataKey="value" stroke="var(--accent-2)" fill="var(--accent-2)" fillOpacity={0.15} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
              formatter={v => [`${v}/10`]} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Latest grades */}
      <div className="analytics-grade-list">
        {results.slice(-5).reverse().map((r, i) => (
          <div key={i} className="analytics-grade-row">
            <span className={`grade-chip grade-${r.grade}`}>{r.grade}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-h)', fontWeight: 600 }}>{r.final_score?.toFixed(2)}/10</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {new Date(r.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
            </span>
            {r.is_plagiarized && <span style={{ fontSize: '0.72rem', color: 'var(--red)' }}>🚨</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Main ─────────────────────────────────────────── */
export default function TeacherAnalytics() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [sortBy, setSortBy] = useState('score_desc')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([getAllAssignments(), getAnalyticsOverview()])
      .then(([aRes, ovRes]) => {
        setAssignments(aRes.data)
        setAnalytics(ovRes.data)
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  // Build per-student stats
  const studentMap = {}
  assignments.filter(a => a.status === 'done').forEach(a => {
    if (!studentMap[a.student_id]) {
      studentMap[a.student_id] = {
        id: a.student_id,
        name: a.student_name,
        submissions: 0, totalScore: 0, totalGrammar: 0, totalContent: 0,
        plagCount: 0, grades: [],
      }
    }
    const s = studentMap[a.student_id]
    s.submissions++
    s.totalScore += a.final_score || 0
    s.totalGrammar += a.grammar_score || 0
    s.totalContent += a.content_score || 0
    if (a.is_plagiarized) s.plagCount++
    if (a.grade) s.grades.push(a.grade)
  })

  const students = Object.values(studentMap).map(s => ({
    ...s,
    avgScore: s.submissions ? s.totalScore / s.submissions : 0,
    avgGrammar: s.submissions ? s.totalGrammar / s.submissions : 0,
    avgContent: s.submissions ? s.totalContent / s.submissions : 0,
  }))

  // Subject distribution
  const subjectMap = {}
  assignments.forEach(a => {
    subjectMap[a.subject] = (subjectMap[a.subject] || 0) + 1
  })
  const subjectData = Object.entries(subjectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([subject, count]) => ({ subject, count }))

  // Score distribution buckets
  const buckets = [
    { label: '9–10', min: 9, max: 10, color: 'var(--green)' },
    { label: '7–9', min: 7, max: 9, color: 'var(--blue)' },
    { label: '5–7', min: 5, max: 7, color: 'var(--yellow)' },
    { label: '3–5', min: 3, max: 5, color: '#f97316' },
    { label: '0–3', min: 0, max: 3, color: 'var(--red)' },
  ]
  const done = assignments.filter(a => a.status === 'done')
  const scoreDist = buckets.map(b => ({
    range: b.label,
    count: done.filter(a => (a.final_score || 0) >= b.min && (a.final_score || 0) < b.max).length,
    color: b.color,
  }))

  // Grade dist chart data
  const GRADE_COLORS = { A: 'var(--green)', B: 'var(--blue)', C: 'var(--yellow)', D: '#f97316', F: 'var(--red)' }
  const gradeData = ['A', 'B', 'C', 'D', 'F'].map(g => ({
    grade: g,
    count: analytics?.grade_distribution?.[g] ?? 0,
    color: GRADE_COLORS[g],
  }))

  // Filter + sort students
  const filteredStudents = students
    .filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'score_desc': return b.avgScore - a.avgScore
        case 'score_asc':  return a.avgScore - b.avgScore
        case 'submissions': return b.submissions - a.submissions
        case 'name':       return a.name?.localeCompare(b.name)
        default: return 0
      }
    })

  if (loading) return (
    <div className="page">
      <Navbar links={NAV_LINKS} />
      <div className="page-content">
        <div className="metrics-row">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <Navbar links={NAV_LINKS} />

      <div className="page-content fade-in">

        {/* ── Header ── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Deep dive into class performance &amp; student insights.</p>
          </div>
          <Link to="/teacher" className="btn btn-ghost">← Dashboard</Link>
        </div>

        {/* ── Top metrics ── */}
        <div className="metrics-row" style={{ marginBottom: 24 }}>
          {[
            { icon: '👥', value: students.length, label: 'Students', sub: 'with submissions', accent: 'var(--accent-2)' },
            { icon: '⭐', value: analytics?.average_score?.toFixed(1) ?? '—', label: 'Class Avg', sub: 'out of 10', accent: 'var(--blue)' },
            { icon: '🏆', value: students.length ? Math.max(...students.map(s => s.avgScore)).toFixed(1) : '—', label: 'Top Score', sub: 'student avg', accent: 'var(--green)' },
            { icon: '📚', value: Object.keys(subjectMap).length, label: 'Subjects', sub: 'covered', accent: 'var(--yellow)' },
          ].map((m, i) => (
            <div key={i} className="metric-card fade-in" style={{ animationDelay: `${i * 0.05}s`, '--accent-local': m.accent }}>
              <div className="metric-top">
                <span className="metric-icon" style={{ background: m.accent + '22', color: m.accent }}>{m.icon}</span>
              </div>
              <div className="metric-value" style={{ color: m.accent }}>{m.value}</div>
              <div className="metric-label">{m.label}</div>
              <div className="metric-sub">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Charts row ── */}
        <div className="analytics-charts-row">
          {/* Grade distribution */}
          <div className="card chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Grade Distribution</h3>
              <p className="chart-sub">{done.length} graded assignments</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeData} barSize={36} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="grade" tick={{ fill: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-3)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {gradeData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Score distribution */}
          <div className="card chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Score Ranges</h3>
              <p className="chart-sub">How scores are spread</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreDist} barSize={36} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-3)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {scoreDist.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Subjects */}
          <div className="card chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Submissions by Subject</h3>
              <p className="chart-sub">Top {subjectData.length} subjects</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="subject" width={80} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-3)' }} />
                <Bar dataKey="count" fill="var(--accent-2)" fillOpacity={0.8} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Student table + detail panel ── */}
        <div className={`analytics-student-section ${selectedStudent ? 'with-panel' : ''}`}>
          <div className="analytics-table-wrap">
            {/* Controls */}
            <div className="table-controls" style={{ marginBottom: 14 }}>
              <div className="table-controls-left">
                <h3 className="table-title">Student Performance</h3>
                <span className="table-count">{filteredStudents.length} students</span>
              </div>
              <div className="table-controls-right">
                <input
                  className="form-input search-input"
                  placeholder="Search student…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <select className="form-select filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="score_desc">Highest avg score</option>
                  <option value="score_asc">Lowest avg score</option>
                  <option value="submissions">Most submissions</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No students yet</h3>
                <p>Students will appear here once they submit assignments.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Submissions</th>
                      <th>Avg Score</th>
                      <th>Grammar</th>
                      <th>Content</th>
                      <th>Plagiarism</th>
                      <th>Top Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <StudentRow
                        key={s.id}
                        student={s}
                        onSelect={id => setSelectedStudent(id === selectedStudent ? null : id)}
                        selected={selectedStudent === s.id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedStudent && (
            <StudentDetail
              studentId={selectedStudent}
              allAssignments={assignments}
              onClose={() => setSelectedStudent(null)}
            />
          )}
        </div>

      </div>
    </div>
  )
}

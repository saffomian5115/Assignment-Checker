import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getResult } from '../../api/assignments'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import './StudentPages.css'
import './ResultPage.css'

const NAV_LINKS = [
  { to: '/student', label: 'My Assignments', icon: '📄' },
  { to: '/student/submit', label: 'Submit', icon: '⬆️' },
]

/* ── Circular score ring (SVG) ────────────────────── */
function ScoreRing({ score, max = 10, size = 120, stroke = 8, color, label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(score / max, 1)
  const dash = pct * circ

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--bg-3)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="ring-inner" style={{ width: size, height: size }}>
        <span className="ring-val" style={{ color }}>{score?.toFixed(1)}</span>
        <span className="ring-label">{label}</span>
      </div>
    </div>
  )
}

/* ── Sub-score bar ───────────────────────────────── */
function SubBar({ label, value, color }) {
  const pct = Math.min((value / 10) * 100, 100)
  return (
    <div className="sub-bar-row">
      <span className="sub-bar-label">{label}</span>
      <div className="sub-bar-track">
        <div
          className="sub-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="sub-bar-val" style={{ color }}>{value?.toFixed(1)}</span>
    </div>
  )
}

/* ── Grammar error card ──────────────────────────── */
function GrammarError({ error, index }) {
  const [open, setOpen] = useState(false)
  const typeColors = {
    grammar: 'var(--red)',
    spelling: 'var(--yellow)',
    style: 'var(--blue)',
    punctuation: 'var(--accent-2)',
  }
  const color = typeColors[error.type] || 'var(--text-muted)'

  return (
    <div className={`grammar-card ${open ? 'open' : ''}`}>
      <button className="grammar-card-header" onClick={() => setOpen(!open)}>
        <span className="grammar-error-num" style={{ background: color + '22', color }}>
          #{index + 1}
        </span>
        <span className="grammar-error-msg">{error.message}</span>
        <span className="grammar-badge" style={{ background: color + '22', color }}>
          {error.type || 'grammar'}
        </span>
        <span className="grammar-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="grammar-card-body">
          {error.context && (
            <div className="grammar-context">
              <span className="grammar-context-label">Context</span>
              <code>{error.context}</code>
            </div>
          )}
          {error.suggestions?.length > 0 && (
            <div className="grammar-suggestions">
              <span className="grammar-context-label">Suggestions</span>
              <div className="suggestion-chips">
                {error.suggestions.map((s, i) => (
                  <span key={i} className="suggestion-chip">{s}</span>
                ))}
              </div>
            </div>
          )}
          {error.category && (
            <div className="grammar-category">
              Category: <strong>{error.category}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Plagiarism match card ───────────────────────── */
function PlagiarismMatch({ match }) {
  return (
    <div className="plagiarism-match-card">
      <div className="plagiarism-match-header">
        <span className="plagiarism-match-icon">📋</span>
        <div>
          <div className="plagiarism-match-title">{match.title || 'Untitled'}</div>
          <div className="plagiarism-match-student">{match.student_name}</div>
        </div>
        <div
          className="plagiarism-match-pct"
          style={{ color: match.similarity_score >= 85 ? 'var(--red)' : 'var(--yellow)' }}
        >
          {match.similarity_score}%
        </div>
      </div>
    </div>
  )
}

/* ── Main Result Page ─────────────────────────────── */
export default function ResultPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    let interval = null

    const fetch = async () => {
      try {
        const res = await getResult(id)
        const data = res.data

        // Still checking
        if (data.status === 'checking' || data.status === 'pending') {
          setPolling(true)
          return
        }

        setResult(data)
        setPolling(false)
        setLoading(false)
        if (interval) clearInterval(interval)
      } catch (err) {
        const status = err.response?.status
        if (status === 404) {
          toast.error('Result not found')
          navigate('/student')
        } else {
          toast.error('Failed to load result')
        }
        setLoading(false)
        if (interval) clearInterval(interval)
      }
    }

    fetch()
    interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [id, navigate])

  /* ── Polling / loading state ─────────────────── */
  if (loading || polling) {
    return (
      <div className="page">
        <Navbar links={NAV_LINKS} />
        <div className="page-content fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="result-processing-anim">
              <div className="proc-ring" />
              <div className="proc-ring proc-ring-2" />
              <div className="proc-ring proc-ring-3" />
              <span className="proc-icon">🤖</span>
            </div>
            <h2 style={{ color: 'var(--text-h)', marginTop: 24 }}>AI is checking your assignment…</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              Running grammar, plagiarism &amp; content checks in parallel. This usually takes 30–60 seconds.
            </p>
            <div className="proc-steps">
              <div className="proc-step active">📝 Grammar</div>
              <div className="proc-step active">🔍 Plagiarism</div>
              <div className="proc-step active">🧠 Content</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!result) return null

  const {
    final_score, grade, teacher_grade, teacher_comment,
    grammar_score, total_grammar_errors, grammar_errors = [],
    plagiarism_score, is_plagiarized, similarity_score, matched_assignments = [],
    content_score, relevance, structure, depth, clarity,
    strengths = [], improvements = [],
    content_summary,
  } = result

  const displayGrade = teacher_grade || grade
  const gradeColor = {
    A: 'var(--green)', B: 'var(--blue)',
    C: 'var(--yellow)', D: 'var(--red)', F: 'var(--red)',
  }[displayGrade] || 'var(--text-muted)'

  const radarData = [
    { subject: 'Relevance', value: relevance },
    { subject: 'Structure', value: structure },
    { subject: 'Depth', value: depth },
    { subject: 'Clarity', value: clarity },
    { subject: 'Grammar', value: grammar_score },
  ]

  return (
    <div className="page">
      <Navbar links={NAV_LINKS} />

      <div className="page-content fade-in">

        {/* ── Breadcrumb ── */}
        <div className="result-breadcrumb">
          <Link to="/student" className="breadcrumb-link">← My Assignments</Link>
          <span className="breadcrumb-sep">/</span>
          <span>Result</span>
        </div>

        {/* ── Hero score card ── */}
        <div className={`result-hero card ${is_plagiarized ? 'plagiarized' : ''}`}>
          {is_plagiarized && (
            <div className="plagiarism-banner">
              ⚠️ Plagiarism Detected — Final score overridden to 0
            </div>
          )}
          {teacher_grade && (
            <div className="teacher-override-banner">
              ✏️ Teacher has overridden this grade
            </div>
          )}

          <div className="hero-left">
            <div className="hero-grade-wrap">
              <div className="hero-grade" style={{ color: gradeColor, borderColor: gradeColor + '44' }}>
                {displayGrade}
              </div>
              <div className="hero-grade-label">Grade</div>
            </div>
            <div>
              <div className="hero-score">{final_score?.toFixed(2)}<span className="hero-score-max">/10</span></div>
              <div className="hero-score-label">Final Score</div>
              {teacher_comment && (
                <div className="teacher-comment-box">
                  <span className="teacher-comment-icon">💬</span>
                  <span>{teacher_comment}</span>
                </div>
              )}
            </div>
          </div>

          <div className="hero-rings">
            <ScoreRing score={grammar_score} label="Grammar" color="var(--blue)" size={100} />
            <ScoreRing score={content_score} label="Content" color="var(--accent-2)" size={100} />
            <ScoreRing score={plagiarism_score} label="Originality" color="var(--green)" size={100} />
          </div>
        </div>

        {/* ── 3-column grid ── */}
        <div className="result-grid">

          {/* ─ Grammar ─ */}
          <section className="result-section card">
            <div className="section-header">
              <span className="section-icon" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>📝</span>
              <div>
                <h3 className="section-title">Grammar</h3>
                <p className="section-sub">
                  {total_grammar_errors} error{total_grammar_errors !== 1 ? 's' : ''} found
                </p>
              </div>
              <div className="section-score" style={{ color: 'var(--blue)' }}>
                {grammar_score?.toFixed(1)}<span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/10</span>
              </div>
            </div>

            {grammar_errors.length === 0 ? (
              <div className="section-empty">
                <span>✅</span>
                <span>No grammar errors found!</span>
              </div>
            ) : (
              <div className="grammar-errors-list">
                {grammar_errors.slice(0, 20).map((err, i) => (
                  <GrammarError key={i} error={err} index={i} />
                ))}
                {grammar_errors.length > 20 && (
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
                    + {grammar_errors.length - 20} more errors
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ─ Content ─ */}
          <section className="result-section card">
            <div className="section-header">
              <span className="section-icon" style={{ background: 'var(--accent-bg)', color: 'var(--accent-2)' }}>🧠</span>
              <div>
                <h3 className="section-title">Content Quality</h3>
                <p className="section-sub">AI content evaluation</p>
              </div>
              <div className="section-score" style={{ color: 'var(--accent-2)' }}>
                {content_score?.toFixed(1)}<span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/10</span>
              </div>
            </div>

            {/* Sub-score bars */}
            <div className="sub-bars">
              <SubBar label="Relevance" value={relevance} color="var(--accent-2)" />
              <SubBar label="Structure" value={structure} color="var(--blue)" />
              <SubBar label="Depth" value={depth} color="var(--green)" />
              <SubBar label="Clarity" value={clarity} color="var(--yellow)" />
            </div>

            {/* Radar chart */}
            <div className="radar-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="var(--accent-2)"
                    fill="var(--accent-2)"
                    fillOpacity={0.15}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v?.toFixed(1)}/10`]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary */}
            {content_summary && (
              <div className="content-summary">
                <p className="content-summary-label">AI Summary</p>
                <p>{content_summary}</p>
              </div>
            )}

            {/* Strengths & improvements */}
            {strengths.length > 0 && (
              <div className="feedback-list">
                <p className="feedback-list-label strengths-label">💪 Strengths</p>
                <ul>
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {improvements.length > 0 && (
              <div className="feedback-list">
                <p className="feedback-list-label improvements-label">🔧 Areas to Improve</p>
                <ul>
                  {improvements.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </section>

          {/* ─ Plagiarism ─ */}
          <section className="result-section card">
            <div className="section-header">
              <span
                className="section-icon"
                style={{
                  background: is_plagiarized ? 'var(--red-bg)' : 'var(--green-bg)',
                  color: is_plagiarized ? 'var(--red)' : 'var(--green)',
                }}
              >
                {is_plagiarized ? '🚨' : '✅'}
              </span>
              <div>
                <h3 className="section-title">Originality</h3>
                <p className="section-sub">
                  {is_plagiarized ? 'Plagiarism detected' : 'No plagiarism detected'}
                </p>
              </div>
              <div
                className="section-score"
                style={{ color: is_plagiarized ? 'var(--red)' : 'var(--green)' }}
              >
                {plagiarism_score?.toFixed(1)}<span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/10</span>
              </div>
            </div>

            {/* Similarity meter */}
            <div className="similarity-meter">
              <div className="similarity-labels">
                <span>Similarity</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: similarity_score >= 70 ? 'var(--red)' : similarity_score >= 40 ? 'var(--yellow)' : 'var(--green)',
                  }}
                >
                  {similarity_score?.toFixed(1)}%
                </span>
              </div>
              <div className="similarity-track">
                <div
                  className="similarity-fill"
                  style={{
                    width: `${Math.min(similarity_score, 100)}%`,
                    background: similarity_score >= 70
                      ? 'var(--red)'
                      : similarity_score >= 40
                      ? 'var(--yellow)'
                      : 'var(--green)',
                  }}
                />
                {/* Threshold marker at 70% */}
                <div className="similarity-threshold" style={{ left: '70%' }} />
              </div>
              <div className="similarity-legend">
                <span style={{ color: 'var(--green)' }}>● Original</span>
                <span style={{ color: 'var(--yellow)' }}>● Suspicious</span>
                <span style={{ color: 'var(--red)' }}>● Plagiarized</span>
              </div>
            </div>

            {is_plagiarized && matched_assignments.length > 0 && (
              <div className="plagiarism-matches">
                <p className="plagiarism-matches-label">Matched assignments</p>
                {matched_assignments.map((m, i) => (
                  <PlagiarismMatch key={i} match={m} />
                ))}
              </div>
            )}

            {!is_plagiarized && (
              <div className="section-empty" style={{ marginTop: 16 }}>
                <span>🎉</span>
                <span>Your work appears to be original!</span>
              </div>
            )}
          </section>

        </div>

        {/* ── Back button ── */}
        <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
          <Link to="/student" className="btn btn-secondary">← Back to Assignments</Link>
          <Link to="/student/submit" className="btn btn-primary">Submit another →</Link>
        </div>

      </div>
    </div>
  )
}
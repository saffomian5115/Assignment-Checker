import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getAssignmentDetail,
  getAllAssignments,
  overrideGrade,
  addComment,
} from '../../api/assignments'
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
import './TeacherPages.css'
import './AssignmentDetail.css'

const NAV_LINKS = [
  { to: '/teacher', label: 'Dashboard', icon: '📊' },
]

const GRADES = ['A', 'B', 'C', 'D', 'F']

/* ── Score Ring ─────────────────────────────────── */
function ScoreRing({ score, max = 10, size = 96, stroke = 7, color, label }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(score / max, 1) * circ
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="ring-inner" style={{ width: size, height: size }}>
        <span className="ring-val" style={{ color }}>{score?.toFixed(1)}</span>
        <span className="ring-label">{label}</span>
      </div>
    </div>
  )
}

/* ── Sub Bar ─────────────────────────────────────── */
function SubBar({ label, value, color }) {
  return (
    <div className="sub-bar-row">
      <span className="sub-bar-label">{label}</span>
      <div className="sub-bar-track">
        <div className="sub-bar-fill" style={{ width: `${Math.min((value/10)*100,100)}%`, background: color }} />
      </div>
      <span className="sub-bar-val" style={{ color }}>{value?.toFixed(1)}</span>
    </div>
  )
}

/* ── Collapsible grammar error ───────────────────── */
function GrammarError({ error, index }) {
  const [open, setOpen] = useState(false)
  const typeColors = { grammar:'var(--red)', spelling:'var(--yellow)', style:'var(--blue)', punctuation:'var(--accent-2)' }
  const color = typeColors[error.type] || 'var(--text-muted)'
  return (
    <div className={`grammar-card ${open?'open':''}`}>
      <button className="grammar-card-header" onClick={() => setOpen(!open)}>
        <span className="grammar-error-num" style={{ background: color+'22', color }}>#{index+1}</span>
        <span className="grammar-error-msg">{error.message}</span>
        <span className="grammar-badge" style={{ background: color+'22', color }}>{error.type||'grammar'}</span>
        <span className="grammar-chevron">{open?'▲':'▼'}</span>
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
                {error.suggestions.map((s, i) => <span key={i} className="suggestion-chip">{s}</span>)}
              </div>
            </div>
          )}
          {error.category && <div className="grammar-category">Category: <strong>{error.category}</strong></div>}
        </div>
      )}
    </div>
  )
}

/* ── Plagiarism match card ───────────────────────── */
function PlagMatch({ match }) {
  return (
    <div className="plag-match-card">
      <div className="plag-match-row">
        <span className="plag-match-icon">📋</span>
        <div className="plag-match-info">
          <span className="plag-match-title">{match.title || 'Untitled'}</span>
          <span className="plag-match-student">{match.student_name}</span>
        </div>
        <span className="plag-match-pct"
          style={{ color: match.similarity_score>=85 ? 'var(--red)' : 'var(--yellow)' }}>
          {match.similarity_score}%
        </span>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────── */
export default function AssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data,    setData]    = useState(null)       // { assignment, result }
  const [allIds,  setAllIds]  = useState([])         // for prev/next nav
  const [loading, setLoading] = useState(true)

  // Override form state
  const [selGrade,   setSelGrade]   = useState('')
  const [comment,    setComment]    = useState('')
  const [saving,     setSaving]     = useState(false)
  const [commentOnly, setCommentOnly] = useState(false)

  /* fetch detail + sibling ids */
  const fetchDetail = useCallback(async () => {
    try {
      const [detailRes, allRes] = await Promise.all([
        getAssignmentDetail(id),
        getAllAssignments(),
      ])
      setData(detailRes.data)
      // only done assignments navigable
      const doneIds = allRes.data
        .filter(a => a.status === 'done')
        .sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
        .map(a => a.id)
      setAllIds(doneIds)

      // pre-fill override form
      const res = detailRes.data.result
      if (res) {
        setSelGrade(res.teacher_grade || '')
        setComment(res.teacher_comment || '')
      }
    } catch {
      toast.error('Failed to load assignment')
      navigate('/teacher')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  /* prev / next */
  const currentIdx = allIds.indexOf(id)
  const prevId = currentIdx > 0 ? allIds[currentIdx - 1] : null
  const nextId = currentIdx < allIds.length - 1 ? allIds[currentIdx + 1] : null

  /* save grade override */
  const handleSaveGrade = async () => {
    if (!selGrade) { toast.error('Select a grade first'); return }
    setSaving(true)
    try {
      await overrideGrade(id, { grade: selGrade, comment: comment || null })
      toast.success(`Grade overridden to ${selGrade}`)
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save grade')
    } finally { setSaving(false) }
  }

  /* save comment only */
  const handleSaveComment = async () => {
    if (!comment.trim()) { toast.error('Comment cannot be empty'); return }
    setSaving(true)
    try {
      await addComment(id, { comment })
      toast.success('Comment saved')
      fetchDetail()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save comment')
    } finally { setSaving(false) }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="page">
        <Navbar links={NAV_LINKS} />
        <div className="page-content">
          <div className="detail-skeleton">
            {[...Array(6)].map((_,i) => (
              <div key={i} className="skeleton"
                style={{ height: i===0?48:i===1?120:80, borderRadius:'var(--r-lg)', animationDelay:`${i*0.08}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { assignment, result } = data
  if (!result) {
    return (
      <div className="page">
        <Navbar links={NAV_LINKS} />
        <div className="page-content">
          <div className="empty-state" style={{ marginTop:48 }}>
            <div className="empty-icon">⏳</div>
            <h3>Result not available yet</h3>
            <p>This assignment is still being processed.</p>
            <Link to="/teacher" className="btn btn-secondary">← Back to Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  const {
    final_score, grade, teacher_grade, teacher_comment, overridden_by,
    grammar_score, total_grammar_errors, grammar_errors=[],
    plagiarism_score, is_plagiarized, similarity_score, matched_assignments=[],
    content_score, relevance, structure, depth, clarity,
    strengths=[], improvements=[], content_summary,
  } = result

  const displayGrade = teacher_grade || grade
  const gradeColor = { A:'var(--green)', B:'var(--blue)', C:'var(--yellow)', D:'var(--red)', F:'var(--red)' }[displayGrade] || 'var(--text-muted)'

  const radarData = [
    { subject:'Relevance', value: relevance },
    { subject:'Structure', value: structure },
    { subject:'Depth',     value: depth     },
    { subject:'Clarity',   value: clarity   },
    { subject:'Grammar',   value: grammar_score },
  ]

  return (
    <div className="page">
      <Navbar links={NAV_LINKS} />

      <div className="page-content fade-in">

        {/* ── Top nav bar ── */}
        <div className="detail-topbar">
          <Link to="/teacher" className="breadcrumb-link">← Dashboard</Link>
          <div className="detail-nav-btns">
            <button
              className="btn btn-ghost btn-sm"
              disabled={!prevId}
              onClick={() => navigate(`/teacher/assignment/${prevId}`)}
            >← Prev</button>
            <span className="detail-nav-pos">
              {currentIdx >= 0 ? `${currentIdx+1} / ${allIds.length}` : '—'}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={!nextId}
              onClick={() => navigate(`/teacher/assignment/${nextId}`)}
            >Next →</button>
          </div>
        </div>

        {/* ── Assignment meta strip ── */}
        <div className="detail-meta-strip card fade-in">
          <div className="meta-left">
            <div className="meta-student-avatar">
              {assignment.student_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="meta-title">{assignment.title}</h2>
              <div className="meta-row">
                <span className="meta-chip">{assignment.student_name}</span>
                <span className="meta-chip">{assignment.subject}</span>
                <span className="meta-chip">{assignment.word_count?.toLocaleString()} words</span>
                <span className="meta-chip">{assignment.filename}</span>
                <span className="meta-chip">
                  {new Date(assignment.created_at).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'})}
                </span>
              </div>
            </div>
          </div>
          <div className="meta-right">
            {is_plagiarized && (
              <span className="plag-flag-large">🚨 Plagiarized</span>
            )}
            {teacher_grade && (
              <span className="override-badge">✏️ Overridden</span>
            )}
          </div>
        </div>

        {/* ── Hero score row ── */}
        <div className="detail-hero card fade-in" style={{ animationDelay:'0.05s' }}>
          {is_plagiarized && (
            <div className="plagiarism-banner">⚠️ Plagiarism Detected — Score overridden to 0</div>
          )}
          {teacher_grade && (
            <div className="teacher-override-banner">✏️ Teacher grade override active</div>
          )}

          <div className="hero-score-block">
            <div className="hero-grade" style={{ color: gradeColor, borderColor: gradeColor+'44' }}>
              {displayGrade}
            </div>
            <div>
              <div className="hero-final-score">
                {final_score?.toFixed(2)}<span className="hero-score-max">/10</span>
              </div>
              <div className="hero-score-label">Final Score</div>
              {teacher_comment && (
                <div className="detail-comment-box">
                  <span>💬</span> <em>"{teacher_comment}"</em>
                </div>
              )}
              {overridden_by && (
                <div className="overridden-note">Grade set by teacher</div>
              )}
            </div>
          </div>

          <div className="hero-rings">
            <ScoreRing score={grammar_score}    label="Grammar"     color="var(--blue)"     />
            <ScoreRing score={content_score}    label="Content"     color="var(--accent-2)" />
            <ScoreRing score={plagiarism_score} label="Originality" color="var(--green)"    />
          </div>
        </div>

        {/* ── 3-panel detail grid ── */}
        <div className="detail-grid">

          {/* ─ Grammar panel ─ */}
          <section className="detail-panel card fade-in" style={{ animationDelay:'0.1s' }}>
            <div className="panel-header">
              <span className="panel-icon" style={{ background:'var(--blue-bg)', color:'var(--blue)' }}>📝</span>
              <div>
                <h3 className="panel-title">Grammar</h3>
                <p className="panel-sub">{total_grammar_errors} error{total_grammar_errors!==1?'s':''} · Score {grammar_score?.toFixed(1)}/10</p>
              </div>
            </div>
            {grammar_errors.length === 0 ? (
              <div className="section-empty"><span>✅</span><span>No grammar errors found!</span></div>
            ) : (
              <div className="grammar-errors-list">
                {grammar_errors.slice(0,25).map((err,i) => <GrammarError key={i} error={err} index={i} />)}
                {grammar_errors.length>25 && (
                  <p className="text-muted" style={{ fontSize:'0.8rem',marginTop:8 }}>
                    +{grammar_errors.length-25} more errors
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ─ Content panel ─ */}
          <section className="detail-panel card fade-in" style={{ animationDelay:'0.12s' }}>
            <div className="panel-header">
              <span className="panel-icon" style={{ background:'var(--accent-bg)', color:'var(--accent-2)' }}>🧠</span>
              <div>
                <h3 className="panel-title">Content Quality</h3>
                <p className="panel-sub">Score {content_score?.toFixed(1)}/10</p>
              </div>
            </div>

            <div className="sub-bars">
              <SubBar label="Relevance" value={relevance} color="var(--accent-2)" />
              <SubBar label="Structure" value={structure} color="var(--blue)"     />
              <SubBar label="Depth"     value={depth}     color="var(--green)"    />
              <SubBar label="Clarity"   value={clarity}   color="var(--yellow)"   />
            </div>

            <div className="radar-wrap">
              <ResponsiveContainer width="100%" height={170}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill:'var(--text-muted)', fontSize:11 }} />
                  <Radar name="Score" dataKey="value" stroke="var(--accent-2)" fill="var(--accent-2)" fillOpacity={0.15} />
                  <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                    formatter={(v) => [`${v?.toFixed(1)}/10`]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {content_summary && (
              <div className="content-summary">
                <p className="content-summary-label">AI Summary</p>
                <p>{content_summary}</p>
              </div>
            )}

            {strengths.length>0 && (
              <div className="feedback-list">
                <p className="feedback-list-label strengths-label">💪 Strengths</p>
                <ul>{strengths.map((s,i)=><li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {improvements.length>0 && (
              <div className="feedback-list">
                <p className="feedback-list-label improvements-label">🔧 Areas to Improve</p>
                <ul>{improvements.map((s,i)=><li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </section>

          {/* ─ Plagiarism panel ─ */}
          <section className="detail-panel card fade-in" style={{ animationDelay:'0.14s' }}>
            <div className="panel-header">
              <span className="panel-icon"
                style={{ background: is_plagiarized?'var(--red-bg)':'var(--green-bg)',
                         color: is_plagiarized?'var(--red)':'var(--green)' }}>
                {is_plagiarized?'🚨':'✅'}
              </span>
              <div>
                <h3 className="panel-title">Originality</h3>
                <p className="panel-sub">
                  {is_plagiarized ? 'Plagiarism detected' : 'No plagiarism detected'} · {similarity_score?.toFixed(1)}% similarity
                </p>
              </div>
            </div>

            {/* Similarity meter */}
            <div className="similarity-meter">
              <div className="similarity-labels">
                <span>Similarity Score</span>
                <span style={{ fontWeight:700, color: similarity_score>=70?'var(--red)':similarity_score>=40?'var(--yellow)':'var(--green)' }}>
                  {similarity_score?.toFixed(1)}%
                </span>
              </div>
              <div className="similarity-track">
                <div className="similarity-fill"
                  style={{ width:`${Math.min(similarity_score,100)}%`,
                    background: similarity_score>=70?'var(--red)':similarity_score>=40?'var(--yellow)':'var(--green)' }} />
                <div className="similarity-threshold" style={{ left:'70%' }} />
              </div>
              <div className="similarity-legend">
                <span style={{ color:'var(--green)' }}>● Original</span>
                <span style={{ color:'var(--yellow)' }}>● Suspicious</span>
                <span style={{ color:'var(--red)' }}>● Plagiarized</span>
              </div>
            </div>

            {is_plagiarized && matched_assignments.length>0 && (
              <div className="plag-matches-list">
                <p className="plag-matches-label">Matched Assignments ({matched_assignments.length})</p>
                {matched_assignments.map((m,i) => <PlagMatch key={i} match={m} />)}
              </div>
            )}

            {!is_plagiarized && (
              <div className="section-empty" style={{ marginTop:16 }}>
                <span>🎉</span><span>Work appears to be original</span>
              </div>
            )}
          </section>
        </div>

        {/* ── Teacher Override Panel ── */}
        <div className="override-panel card fade-in" style={{ animationDelay:'0.18s' }}>
          <div className="override-header">
            <div className="override-header-left">
              <span className="override-icon">✏️</span>
              <div>
                <h3 className="override-title">Teacher Override</h3>
                <p className="override-sub">
                  {teacher_grade
                    ? `Currently overridden to grade ${teacher_grade}`
                    : 'Override the AI grade and add a comment for this student'}
                </p>
              </div>
            </div>
            {teacher_grade && (
              <div className="current-override-badge">
                <span style={{ color: gradeColor }}>Current: {teacher_grade}</span>
              </div>
            )}
          </div>

          <div className="override-body">
            {/* Grade selector */}
            <div className="override-grade-section">
              <label className="override-label">Select Grade</label>
              <div className="grade-selector">
                {GRADES.map((g) => {
                  const gc = { A:'var(--green)', B:'var(--blue)', C:'var(--yellow)', D:'var(--red)', F:'var(--red)' }[g]
                  const active = selGrade === g
                  return (
                    <button
                      key={g}
                      className={`grade-btn ${active?'grade-btn-active':''}`}
                      style={active ? { background: gc+'22', borderColor: gc, color: gc } : {}}
                      onClick={() => setSelGrade(g)}
                    >
                      {g}
                    </button>
                  )
                })}
                {selGrade && (
                  <button className="grade-btn grade-btn-clear" onClick={() => setSelGrade('')}>
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Comment textarea */}
            <div className="override-comment-section">
              <label className="override-label">
                Comment <span className="override-label-hint">(visible to student)</span>
              </label>
              <textarea
                className="form-textarea override-textarea"
                placeholder="Write feedback for the student…"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="char-count">{comment.length} / 1000</div>
            </div>

            {/* Action buttons */}
            <div className="override-actions">
              <button
                className="btn btn-primary"
                disabled={saving || !selGrade}
                onClick={handleSaveGrade}
              >
                {saving ? <><span className="btn-spinner"/>Saving…</> : '💾 Save Grade Override'}
              </button>
              <button
                className="btn btn-secondary"
                disabled={saving || !comment.trim()}
                onClick={handleSaveComment}
              >
                {saving ? <><span className="btn-spinner"/>Saving…</> : '💬 Save Comment Only'}
              </button>
              <div className="override-hint">
                Grade override replaces the AI grade for this student's view.
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom nav ── */}
        <div className="detail-bottom-nav">
          <button
            className="btn btn-ghost"
            disabled={!prevId}
            onClick={() => navigate(`/teacher/assignment/${prevId}`)}
          >← Previous Assignment</button>
          <Link to="/teacher" className="btn btn-secondary">Back to Dashboard</Link>
          <button
            className="btn btn-ghost"
            disabled={!nextId}
            onClick={() => navigate(`/teacher/assignment/${nextId}`)}
          >Next Assignment →</button>
        </div>

      </div>
    </div>
  )
}
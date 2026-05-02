import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { submitAssignment } from '../../api/assignments'
import Navbar from '../../components/Navbar'
import './StudentPages.css'

const NAV_LINKS = [
  { to: '/student', label: 'My Assignments', icon: '📄' },
  { to: '/student/submit', label: 'Submit', icon: '⬆️' },
]

const SUBJECTS = [
  'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'History', 'Geography', 'Economics',
  'Psychology', 'Urdu', 'Islamic Studies', 'General',
]

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const ALLOWED_EXT = ['.pdf', '.docx', '.txt']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

function FileIcon({ ext }) {
  const icons = { pdf: '📄', docx: '📝', txt: '📃' }
  return <span>{icons[ext] || '📎'}</span>
}

export default function SubmitAssignment() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const validateFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`Invalid file type. Allowed: ${ALLOWED_EXT.join(', ')}`)
      return false
    }
    if (f.size > MAX_SIZE) {
      toast.error('File too large. Maximum size is 5 MB.')
      return false
    }
    return true
  }

  const handleFileSelect = (f) => {
    if (f && validateFile(f)) setFile(f)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)

  const onSubmit = async (data) => {
    if (!file) {
      toast.error('Please select a file to upload.')
      return
    }

    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('subject', data.subject)
    formData.append('file', file)

    setSubmitting(true)
    try {
      const res = await submitAssignment(formData)
      toast.success('Assignment submitted! AI check in progress…')
      navigate('/student')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Submission failed. Try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const fileExt = file ? file.name.split('.').pop().toLowerCase() : null
  const fileSizeKB = file ? (file.size / 1024).toFixed(1) : null

  return (
    <div className="page">
      <Navbar links={NAV_LINKS} />

      <div className="page-content fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Submit Assignment</h1>
            <p className="page-subtitle">
              Upload your file and get instant AI-powered feedback.
            </p>
          </div>
        </div>

        <div className="submit-layout">
          {/* Main form */}
          <div className="submit-form-wrap">
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="card submit-card">
                <h3 className="card-section-title">Assignment details</h3>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="title">Title</label>
                    <input
                      id="title"
                      type="text"
                      className={`form-input ${errors.title ? 'error' : ''}`}
                      placeholder="e.g. Essay on Climate Change"
                      {...register('title', {
                        required: 'Title is required',
                        minLength: { value: 3, message: 'At least 3 characters' },
                        maxLength: { value: 200, message: 'Max 200 characters' },
                      })}
                    />
                    {errors.title && <span className="form-error">{errors.title.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="subject">Subject</label>
                    <select
                      id="subject"
                      className={`form-select ${errors.subject ? 'error' : ''}`}
                      {...register('subject', { required: 'Subject is required' })}
                    >
                      <option value="">Select subject…</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.subject && <span className="form-error">{errors.subject.message}</span>}
                  </div>
                </div>

                {/* Drag & drop zone */}
                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label className="form-label">File</label>
                  <div
                    className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => !file && fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileSelect(e.target.files[0])}
                    />

                    {file ? (
                      <div className="file-preview">
                        <div className="file-preview-icon">
                          <FileIcon ext={fileExt} />
                        </div>
                        <div className="file-preview-info">
                          <span className="file-preview-name">{file.name}</span>
                          <span className="file-preview-size">{fileSizeKB} KB · {fileExt?.toUpperCase()}</span>
                        </div>
                        <button
                          type="button"
                          className="file-remove-btn"
                          onClick={(e) => { e.stopPropagation(); setFile(null) }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="drop-zone-inner">
                        <div className="drop-icon">📁</div>
                        <p className="drop-text">
                          <strong>Drag & drop</strong> your file here, or{' '}
                          <span className="drop-browse">browse</span>
                        </p>
                        <p className="drop-hint">PDF, DOCX or TXT · max 5 MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg submit-btn"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><span className="btn-spinner" /> Submitting…</>
                  ) : (
                    '⬆️ Submit assignment'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Info sidebar */}
          <div className="submit-sidebar">
            <div className="card info-card">
              <h4 className="info-card-title">How it works</h4>
              <ol className="info-steps">
                <li>
                  <span className="step-num">1</span>
                  <div>
                    <strong>Upload</strong>
                    <p>PDF, DOCX, or TXT up to 5 MB</p>
                  </div>
                </li>
                <li>
                  <span className="step-num">2</span>
                  <div>
                    <strong>AI checks run</strong>
                    <p>Grammar · Plagiarism · Content quality</p>
                  </div>
                </li>
                <li>
                  <span className="step-num">3</span>
                  <div>
                    <strong>Get your result</strong>
                    <p>Score, grade, detailed feedback</p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="card info-card">
              <h4 className="info-card-title">Scoring weights</h4>
              <div className="weight-bars">
                <div className="weight-row">
                  <span>Content quality</span>
                  <div className="weight-bar-wrap">
                    <div className="weight-bar" style={{ width: '50%', background: 'var(--accent-2)' }} />
                  </div>
                  <span className="weight-pct">50%</span>
                </div>
                <div className="weight-row">
                  <span>Grammar</span>
                  <div className="weight-bar-wrap">
                    <div className="weight-bar" style={{ width: '30%', background: 'var(--blue)' }} />
                  </div>
                  <span className="weight-pct">30%</span>
                </div>
                <div className="weight-row">
                  <span>Originality</span>
                  <div className="weight-bar-wrap">
                    <div className="weight-bar" style={{ width: '20%', background: 'var(--green)' }} />
                  </div>
                  <span className="weight-pct">20%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

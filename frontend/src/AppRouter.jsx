import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StudentDashboard from './pages/student/StudentDashboard'
import SubmitAssignment from './pages/student/SubmitAssignment'
import ResultPage from './pages/student/ResultPage'
import StudentProgress from './pages/student/StudentProgress'   // F7
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import AssignmentDetail from './pages/teacher/AssignmentDetail'
import TeacherAnalytics from './pages/teacher/TeacherAnalytics' // F7
import NotFound from './pages/NotFound'

function RootRedirect() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={user?.role === 'teacher' ? '/teacher' : '/student'} replace />
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Student routes */}
      <Route path="/student" element={<RoleRoute role="student"><StudentDashboard /></RoleRoute>} />
      <Route path="/student/submit" element={<RoleRoute role="student"><SubmitAssignment /></RoleRoute>} />
      <Route path="/student/result/:id" element={<RoleRoute role="student"><ResultPage /></RoleRoute>} />
      <Route path="/student/progress" element={<RoleRoute role="student"><StudentProgress /></RoleRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<RoleRoute role="teacher"><TeacherDashboard /></RoleRoute>} />
      <Route path="/teacher/assignment/:id" element={<RoleRoute role="teacher"><AssignmentDetail /></RoleRoute>} />
      <Route path="/teacher/analytics" element={<RoleRoute role="teacher"><TeacherAnalytics /></RoleRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
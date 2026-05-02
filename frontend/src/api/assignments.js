import api from './axios'

// Student
export const submitAssignment = (formData) =>
  api.post('/api/assignments/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getMyAssignments = () => api.get('/api/assignments/my')
export const getAssignment = (id) => api.get(`/api/assignments/${id}`)

// Result
export const getResult = (id) => api.get(`/api/checker/result/${id}`)
export const triggerCheck = (id) => api.post(`/api/checker/check/${id}`)

// Student specific
export const getMyProgress = () => api.get('/api/student/progress')
export const getNotifications = () => api.get('/api/student/notifications')
export const markNotificationRead = (id) =>
  api.put(`/api/student/notifications/${id}/read`)

// Teacher
export const getAllAssignments = () => api.get('/api/teacher/assignments')
export const getAssignmentDetail = (id) =>
  api.get(`/api/teacher/assignment/${id}`)
export const overrideGrade = (id, data) =>
  api.put(`/api/teacher/assignment/${id}/grade`, data)
export const addComment = (id, data) =>
  api.post(`/api/teacher/assignment/${id}/comment`, data)
export const getAnalyticsOverview = () =>
  api.get('/api/teacher/analytics/overview')
export const getStudentAnalytics = (studentId) =>
  api.get(`/api/teacher/analytics/student/${studentId}`)
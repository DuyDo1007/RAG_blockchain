import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Shield, ShieldCheck, ShieldAlert, UserX, UserCheck, Loader2, Sparkles, Database, Activity, Plus, Trash2, Edit, X, BookOpen, GraduationCap, CheckCircle, BarChart3, Upload, FileText } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function AdminDashboard({ onLessonsUpdated }) {
  const [users, setUsers] = useState([])
  const [lessons, setLessons] = useState([])
  const [activeSubTab, setActiveSubTab] = useState('analytics') // 'analytics' | 'users' | 'lessons'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [dbStats, setDbStats] = useState({ mongodb: 'checking', qdrant: 'checking' })
  const [analyticsData, setAnalyticsData] = useState(null)

  // Modal Form States for Lesson CRUD
  const [showModal, setShowModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    category: 'fundamentals',
    difficulty: 'beginner',
    duration_minutes: 45,
    labEnabled: false,
    labTitle: '',
    labDescription: '',
    labStarterCode: '',
    resources: '',
    quiz_questions: []
  })

  useEffect(() => {
    fetchUsers()
    fetchLessons()
    fetchAnalytics()
    checkDbHealth()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setUsers(res.data || [])
    } catch (err) {
      console.error('Error fetching admin users:', err)
      setError(err.response?.data?.detail || 'Không thể tải danh sách người dùng.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLessons = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE_URL}/admin/lessons`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const dbLessons = (res.data || []).map(l => ({
        ...l,
        id: l.id ? l.id.replace('_', '-') : l.id
      }))
      setLessons(dbLessons)
    } catch (err) {
      console.error('Error fetching admin lessons:', err)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE_URL}/admin/analytics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setAnalyticsData(res.data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
    }
  }

  const checkDbHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health`)
      setDbStats({
        mongodb: res.data.mongodb === 'connected' ? 'CONNECTED' : 'ERROR',
        qdrant: 'ACTIVE'
      })
    } catch (e) {
      setDbStats({ mongodb: 'ERROR', qdrant: 'ERROR' })
    }
  }

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (!window.confirm(`Bạn có chắc muốn thay đổi quyền người dùng này thành ${newRole.toUpperCase()}?`)) return
    
    setActionLoading(userId)
    try {
      const token = localStorage.getItem('access_token')
      await axios.put(`${API_BASE_URL}/admin/users/${userId}/role`, 
        { role: newRole },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (err) {
      alert(err.response?.data?.detail || 'Thay đổi quyền thất bại.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus
    const statusText = newStatus ? 'kích hoạt lại' : 'khóa'
    if (!window.confirm(`Bạn có chắc muốn ${statusText} tài khoản này?`)) return

    setActionLoading(userId)
    try {
      const token = localStorage.getItem('access_token')
      await axios.put(`${API_BASE_URL}/admin/users/${userId}/status`, 
        { is_active: newStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: newStatus } : u))
    } catch (err) {
      alert(err.response?.data?.detail || 'Thay đổi trạng thái thất bại.')
    } finally {
      setActionLoading(null)
    }
  }

  // Lesson CRUD Operations
  const handleOpenCreateModal = () => {
    setEditingLesson(null)
    setFormData({
      id: `lesson-${String(lessons.length + 1).padStart(2, '0')}`,
      title: '',
      description: '',
      category: 'fundamentals',
      difficulty: 'beginner',
      duration_minutes: 45,
      labEnabled: false,
      labTitle: '',
      labDescription: '',
      labStarterCode: '',
      resources: '',
      quiz_questions: []
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (lesson) => {
    setEditingLesson(lesson)
    setFormData({
      id: lesson.id || '',
      title: lesson.title || '',
      description: lesson.description || '',
      category: lesson.category || 'fundamentals',
      difficulty: lesson.difficulty || 'beginner',
      duration_minutes: lesson.duration_minutes || 45,
      labEnabled: lesson.labEnabled || false,
      labTitle: lesson.labTitle || '',
      labDescription: lesson.labDescription || '',
      labStarterCode: lesson.labStarterCode || '',
      resources: (lesson.resources || []).join('\n'),
      quiz_questions: lesson.quiz_questions || []
    })
    setShowModal(true)
  }

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài học ${lessonId}?`)) return
    setActionLoading(lessonId)
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.delete(`${API_BASE_URL}/admin/lessons/${lessonId}`, { headers })
      setLessons(prev => prev.filter(l => l.id !== lessonId))
      if (onLessonsUpdated) onLessonsUpdated()
    } catch (err) {
      alert(err.response?.data?.detail || 'Xóa bài học thất bại.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveLesson = async (e) => {
    e.preventDefault()
    const finalLessonData = {
      ...formData,
      duration_minutes: parseInt(formData.duration_minutes),
      resources: formData.resources.split('\n').filter(r => r.trim() !== '')
    }

    setActionLoading('saving')
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      if (editingLesson) {
        // Edit Mode
        await axios.put(`${API_BASE_URL}/admin/lessons/${editingLesson.id}`, finalLessonData, { headers })
        setLessons(prev => prev.map(l => l.id === editingLesson.id ? { ...l, ...finalLessonData } : l))
      } else {
        // Create Mode
        const res = await axios.post(`${API_BASE_URL}/admin/lessons`, finalLessonData, { headers })
        setLessons(prev => [...prev, finalLessonData])
      }
      setShowModal(false)
      if (onLessonsUpdated) onLessonsUpdated()
    } catch (err) {
      alert(err.response?.data?.detail || 'Lưu thông tin bài học thất bại.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-wide flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-500 animate-pulse" />
            <span>BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Hệ thống quản lý tài khoản học viên, quản lý bài học và thống kê hệ thống
          </p>
        </div>

        {/* Telemetry Panel */}
        <div className="flex gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#0b0e14] border border-slate-900 px-4 py-2 rounded-xl">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-500">MONGO:</span>
            <span className={dbStats.mongodb === 'CONNECTED' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {dbStats.mongodb}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#0b0e14] border border-slate-900 px-4 py-2 rounded-xl">
            <Activity className="w-4 h-4 text-amber-500" />
            <span className="text-slate-500">QDRANT:</span>
            <span className={dbStats.qdrant === 'ACTIVE' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {dbStats.qdrant}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switching */}
      <div className="flex border-b border-slate-800/60 pb-px flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-bold tracking-wide transition-all ${
            activeSubTab === 'analytics'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Thống Kê (Analytics)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-bold tracking-wide transition-all ${
            activeSubTab === 'users'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Quản Lý Học Viên ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('lessons')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-bold tracking-wide transition-all ${
            activeSubTab === 'lessons'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Bài Học & Lab ({lessons.length})</span>
        </button>
      </div>

      {/* Analytics Subtab */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-500 uppercase">Tổng Học Viên Registered</span>
              <h3 className="text-3xl font-extrabold text-slate-100 font-display mt-1">{analyticsData?.total_users || users.length}</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-500 uppercase">Tiến Độ Trung Bình</span>
              <h3 className="text-3xl font-extrabold text-amber-400 font-display mt-1">{analyticsData?.avg_progress_percentage || 0}%</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-500 uppercase">Phiên Chat AI (Sessions)</span>
              <h3 className="text-3xl font-extrabold text-cyan-400 font-display mt-1">{analyticsData?.total_sessions || 0}</h3>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-slate-900 bg-slate-950/40">
              <span className="text-xs font-mono text-slate-500 uppercase">Bài Học Đã Hoàn Thành</span>
              <h3 className="text-3xl font-extrabold text-emerald-400 font-display mt-1">{analyticsData?.total_completed_lessons || 0}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Users Tab Content */}
      {activeSubTab === 'users' && (
        <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden shadow-2xl bg-slate-950/10">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="font-mono text-sm">Đang truy vấn dữ liệu từ MongoDB Core...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-mono">
                Không có người dùng nào được ghi nhận.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0b0e14]/90 border-b border-slate-900 text-xs font-mono text-slate-500 uppercase">
                    <th className="p-4 pl-6">Học viên</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Nhà cung cấp</th>
                    <th className="p-4">Quyền hạn</th>
                    <th className="p-4">Hoàn thành</th>
                    <th className="p-4 text-right pr-6">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-sm font-sans">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs text-slate-350">
                          {u.username ? u.username.slice(0, 2).toUpperCase() : 'US'}
                        </div>
                        <div>
                          <span className={`font-bold block ${u.is_active ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                            {u.username || 'User'}
                          </span>
                          {!u.is_active && (
                            <span className="text-[10px] text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase font-mono">
                              Đã Chặn
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-mono text-xs">{u.email}</td>
                      <td className="p-4 text-slate-400 capitalize text-xs font-mono">{u.auth_provider}</td>
                      <td className="p-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 font-mono">
                            <ShieldCheck className="w-3 h-3 text-amber-500" /> ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-lg border border-slate-800 font-mono">
                            Học viên
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-300 font-bold">{u.lessons_completed} bài</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-900 border border-slate-850 overflow-hidden hidden sm:block">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${u.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {actionLoading === u.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          ) : (
                            <>
                              {/* Toggle Role Button */}
                              <button
                                onClick={() => handleToggleRole(u.id, u.role)}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                                  u.role === 'admin'
                                    ? 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                }`}
                                title={u.role === 'admin' ? 'Hạ quyền xuống User' : 'Thăng quyền lên Admin'}
                              >
                                {u.role === 'admin' ? 'Bỏ Admin' : 'Làm Admin'}
                              </button>

                              {/* Block/Unblock Button */}
                              <button
                                onClick={() => handleToggleStatus(u.id, u.is_active)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                                  u.is_active
                                    ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                                    : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={u.is_active ? 'Khóa tài khoản' : 'Kích hoạt lại tài khoản'}
                              >
                                {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Lessons Tab Content */}
      {activeSubTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold font-mono text-slate-450 uppercase tracking-widest">Danh Sách Bài Học & Phòng Lab</h3>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition shadow-md shadow-amber-500/15"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bài Học Mới</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden shadow-2xl bg-slate-950/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-[#0b0e14]/90 border-b border-slate-900 text-xs font-mono text-slate-500 uppercase">
                    <th className="p-4 pl-6">ID</th>
                    <th className="p-4">Tên bài học</th>
                    <th className="p-4">Chủ đề</th>
                    <th className="p-4">Độ khó</th>
                    <th className="p-4">Thời lượng</th>
                    <th className="p-4 text-center">Phòng Lab</th>
                    <th className="p-4 text-right pr-6">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-sm">
                  {lessons.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 pl-6 font-mono text-xs text-amber-500 font-semibold">{lesson.id}</td>
                      <td className="p-4 font-bold text-slate-200">{lesson.title}</td>
                      <td className="p-4 text-xs font-mono text-slate-400 capitalize">{lesson.category}</td>
                      <td className="p-4">
                        <span className={`text-xs font-bold capitalize font-mono ${
                          lesson.difficulty === 'advanced' ? 'text-rose-400' :
                          lesson.difficulty === 'intermediate' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {lesson.difficulty}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-300">{lesson.duration_minutes} phút</td>
                      <td className="p-4 text-center">
                        {lesson.labEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 font-mono">
                            ACTIVE LAB
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-550 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800 font-mono">
                            Chỉ Lý Thuyết
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {actionLoading === lesson.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(lesson)}
                                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                                title="Sửa bài học"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-1.5 rounded-lg border border-rose-500/20 text-rose-450 hover:bg-rose-500/10"
                                title="Xóa bài học"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass-strong rounded-2xl shadow-2xl border border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col animate-slide-up overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <h3 className="text-base font-bold font-display tracking-wider flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>{editingLesson ? `CẬP NHẬT BÀI HỌC: ${editingLesson.id}` : 'THÊM BÀI HỌC MỚI'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-900 rounded-xl transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Mã Bài Học (ID)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingLesson}
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="e.g. lesson-13"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Tên Bài Học</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Tên tiêu đề bài học"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Mô tả bài học</label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả nội dung tóm tắt của bài học..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Chủ Đề</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-350 focus:border-amber-500/50 cursor-pointer"
                  >
                    <option value="fundamentals">Nền tảng</option>
                    <option value="smart-contracts">Smart Contract</option>
                    <option value="vulnerabilities">Lỗ hổng</option>
                    <option value="defi-security">DeFi Security</option>
                    <option value="web3-security">Web3 Security</option>
                    <option value="auditing">Auditing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Độ khó</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-350 focus:border-amber-500/50 cursor-pointer"
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung bình</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Thời lượng (Phút)</label>
                  <input
                    type="number"
                    required
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
                <input
                  type="checkbox"
                  id="labEnabled"
                  checked={formData.labEnabled}
                  onChange={(e) => setFormData({ ...formData, labEnabled: e.target.checked })}
                  className="w-4.5 h-4.5 accent-amber-500 rounded border-slate-800 cursor-pointer"
                />
                <label htmlFor="labEnabled" className="text-xs font-bold text-slate-300 font-mono cursor-pointer uppercase select-none">
                  Kích hoạt phòng thực hành (Interactive Lab) cho bài học này
                </label>
              </div>

              {formData.labEnabled && (
                <div className="space-y-4 p-4 bg-slate-950/40 border border-slate-850 rounded-xl animate-fade-in">
                  <div>
                    <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Tiêu đề phòng Lab</label>
                    <input
                      type="text"
                      required={formData.labEnabled}
                      value={formData.labTitle}
                      onChange={(e) => setFormData({ ...formData, labTitle: e.target.value })}
                      placeholder="e.g. Sửa lỗi bảo mật Reentrancy"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Mô tả nhiệm vụ Lab</label>
                    <textarea
                      rows={2}
                      required={formData.labEnabled}
                      value={formData.labDescription}
                      onChange={(e) => setFormData({ ...formData, labDescription: e.target.value })}
                      placeholder="Viết mô tả nhiệm vụ của Lab..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Mã nguồn Lab mẫu (Starter Code)</label>
                    <textarea
                      rows={8}
                      required={formData.labEnabled}
                      value={formData.labStarterCode}
                      onChange={(e) => setFormData({ ...formData, labStarterCode: e.target.value })}
                      placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.0;&#10;..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:border-amber-500/50 transition-all font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Quiz Questions Builder */}
              <div className="border-t border-slate-850 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-slate-500 uppercase">
                    Câu hỏi trắc nghiệm ({formData.quiz_questions.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        quiz_questions: [
                          ...formData.quiz_questions,
                          { question: '', options: ['', '', '', ''], correct: 0, correct_answer: 0 }
                        ]
                      })
                    }}
                    className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-bold font-mono transition bg-slate-900/60 border border-slate-800 py-1.5 px-3 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm câu hỏi
                  </button>
                </div>

                {formData.quiz_questions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Chưa có câu hỏi trắc nghiệm nào cho bài học này.</p>
                ) : (
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                    {formData.quiz_questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl relative space-y-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              quiz_questions: formData.quiz_questions.filter((_, idx) => idx !== qIdx)
                            })
                          }}
                          className="absolute top-3.5 right-3.5 text-slate-500 hover:text-rose-450 transition cursor-pointer"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider">
                          Câu hỏi {qIdx + 1}
                        </div>

                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Nhập câu hỏi trắc nghiệm..."
                            value={q.question}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                quiz_questions: formData.quiz_questions.map((item, idx) => 
                                  idx === qIdx ? { ...item, question: e.target.value } : item
                                )
                              })
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all font-sans"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-500 font-bold">{optIdx + 1}.</span>
                              <input
                                type="text"
                                required
                                placeholder={`Phương án trả lời ${optIdx + 1}...`}
                                value={opt}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    quiz_questions: formData.quiz_questions.map((item, idx) => {
                                      if (idx === qIdx) {
                                        const newOpts = [...item.options]
                                        newOpts[optIdx] = e.target.value
                                        return { ...item, options: newOpts }
                                      }
                                      return item
                                    })
                                  })
                                }}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:border-amber-500/50 transition-all font-sans"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">Đáp án đúng:</span>
                          <select
                            value={q.correct !== undefined ? q.correct : (q.correct_answer !== undefined ? q.correct_answer : 0)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value)
                              setFormData({
                                ...formData,
                                quiz_questions: formData.quiz_questions.map((item, idx) => 
                                  idx === qIdx ? { ...item, correct: val, correct_answer: val } : item
                                )
                              })
                            }}
                            className="bg-slate-900 border border-slate-850 rounded-lg py-1 px-2.5 text-xs text-amber-500 font-bold focus:border-amber-500/50 transition-all cursor-pointer font-mono"
                          >
                            <option value={0}>Lựa chọn 1</option>
                            <option value={1}>Lựa chọn 2</option>
                            <option value={2}>Lựa chọn 3</option>
                            <option value={3}>Lựa chọn 4</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase">Tài liệu tham khảo (Một liên kết mỗi dòng)</label>
                <textarea
                  rows={3}
                  value={formData.resources}
                  onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                  placeholder="Tên tài liệu | https://example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:border-amber-500/50 transition-all font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 font-semibold rounded-xl text-sm transition border border-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'saving'}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-md shadow-amber-500/15"
                >
                  {actionLoading === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingLesson ? 'Cập Nhật' : 'Tạo Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

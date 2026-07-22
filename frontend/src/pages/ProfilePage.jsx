import React, { useState, useEffect } from 'react'
import { User, Mail, Shield, Calendar, Edit2, Check, Trash2, Award, Zap, BookOpen, Clock, Loader2, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const DEFAULT_AVATARS = [
  { name: 'Solidity Dev', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=solidity' },
  { name: 'White Hat', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=security' },
  { name: 'DeFi Ninja', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=defijack' },
  { name: 'Crypto Auditor', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=auditor' },
  { name: 'Sec Specialist', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=cyber' },
  { name: 'Hacker Neo', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=hacker' },
  { name: 'Smart Contract', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=crypto' },
  { name: 'Chain Master', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=blockchain' }
]

export default function ProfilePage({ lessons = [] }) {
  const { user, logout, isGuest } = useAuth()
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  
  // States for API actions
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Progress Stats
  const [progress, setProgress] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(true)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setAvatarUrl(user.avatar_url || '')
      fetchProgress()
    } else {
      setProgress(null)
    }
  }, [user?.id, user?._id, isGuest])

  const fetchProgress = async () => {
    if (!user || isGuest) return
    setLoadingProgress(true)
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const userId = user.id || user._id
      const res = await axios.get(`${API_BASE_URL}/roadmap/progress/${userId}`, { headers })
      if (res.data && res.data.length > 0) {
        setProgress(res.data[0])
      } else {
        const roadmapRes = await axios.get(`${API_BASE_URL}/roadmap/beginner`, { headers })
        const roadmapId = roadmapRes.data.id || roadmapRes.data._id
        await axios.post(`${API_BASE_URL}/roadmap/progress/start?user_id=${userId}&roadmap_id=${roadmapId}`, {}, { headers })
        const refetch = await axios.get(`${API_BASE_URL}/roadmap/progress/${userId}`, { headers })
        if (refetch.data && refetch.data.length > 0) {
          setProgress(refetch.data[0])
        }
      }
    } catch (err) {
      console.error('Error fetching progress stats in profile:', err)
    } finally {
      setLoadingProgress(false)
    }
  }

  const handleUpdateProfile = async (newUsername, newAvatar) => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const res = await axios.put(
        `${API_BASE_URL}/auth/me`,
        {
          username: newUsername,
          avatar_url: newAvatar
        },
        { headers }
      )
      
      // Update local storage user info
      const updatedUser = { ...user, username: res.data.username, avatar_url: res.data.avatar_url }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setSuccess('Cập nhật hồ sơ cá nhân thành công!')
      
      // Force refresh header / context state
      window.dispatchEvent(new Event('storage'))
      
      // Temporary page refresh to apply avatar
      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (err) {
      setError(err.response?.data?.detail || 'Cập nhật thông tin thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn tài khoản và toàn bộ tiến trình học tập của bạn. Bạn có chắc chắn muốn tiếp tục?')) {
      return
    }
    
    setDeleting(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.delete(`${API_BASE_URL}/auth/me`, { headers })
      alert('Tài khoản của bạn đã được xóa thành công.')
      logout()
    } catch (err) {
      setError(err.response?.data?.detail || 'Xóa tài khoản thất bại.')
      setDeleting(false)
    }
  }

  // Progress metrics
  const rawCompleted = progress?.completed_lessons || []
  const completedIds = rawCompleted.map(id => id ? id.replace('_', '-') : id)
  const coreCompletedCount = completedIds.filter(id => !id.startsWith('lab-')).length
  const totalLessons = lessons.length
  const progressPercent = totalLessons > 0 ? Math.min(100, (coreCompletedCount / totalLessons) * 100) : 0
  const totalXP = completedIds.length * 500

  // Auditor Rank
  const getAuditorRank = (percent) => {
    if (percent >= 81) return { title: 'Huyền thoại Security Lead', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' }
    if (percent >= 51) return { title: 'Senior Auditor Cao cấp', color: 'text-purple-400 bg-purple-500/10 border-purple-500/25' }
    if (percent >= 26) return { title: 'Chuyên viên Smart Contract', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25' }
    return { title: 'Học viên Tập sự (Novice)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/25' }
  }

  const rank = getAuditorRank(progressPercent)

  // Find completed lesson details
  const completedLessonsList = lessons.filter(l => completedIds.includes(l.id ? l.id.replace('_', '-') : ''))

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in text-slate-100 font-sans">
      {/* Title */}
      <div className="border-b border-slate-900 pb-5">
        <h1 className="text-2xl font-bold font-display tracking-wide flex items-center gap-2.5">
          <User className="w-7 h-7 text-amber-500" />
          <span>HỒ SƠ CÁ NHÂN</span>
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1 uppercase">
          Quản lý tài khoản, cập nhật thông tin và theo dõi tiến độ kiểm toán Web3
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-350 rounded-2xl text-sm font-mono flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-350 rounded-2xl text-sm font-mono flex items-center gap-2">
          <span>✔️ {success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Account Details & Editing */}
        <div className="glass-strong border border-slate-850 rounded-2xl p-6 flex flex-col items-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-cyan-500" />
          
          {/* Avatar Area */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-slate-950/80 border-2 border-slate-800 flex items-center justify-center overflow-hidden shadow-xl shadow-slate-950/40 relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-2xl text-slate-400">{username.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              className="absolute bottom-0 right-0 p-2 bg-amber-500 text-slate-950 rounded-full hover:bg-amber-600 transition shadow-lg cursor-pointer"
              title="Thay đổi Avatar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar Selector Grid */}
          {showAvatarSelector && (
            <div className="w-full bg-slate-950/90 border border-slate-850 p-4 rounded-xl space-y-3 z-10 animate-fade-in">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Chọn ảnh đại diện Cyberpunk</span>
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_AVATARS.map((avt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAvatarUrl(avt.url)
                      setShowAvatarSelector(false)
                      handleUpdateProfile(username, avt.url)
                    }}
                    className={`w-11 h-11 rounded-xl bg-slate-900 border overflow-hidden p-0.5 hover:border-amber-500 transition cursor-pointer ${
                      avatarUrl === avt.url ? 'border-amber-500' : 'border-slate-800'
                    }`}
                  >
                    <img src={avt.url} alt={avt.name} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 block mb-1">Hoặc nhập URL ảnh tùy chỉnh:</span>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.png"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  onBlur={() => handleUpdateProfile(username, avatarUrl)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:border-amber-500/50 transition-all font-mono"
                />
              </div>
            </div>
          )}

          {/* User Details */}
          <div className="w-full space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Tên hiển thị</label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-sm text-slate-100 focus:border-amber-500/50 transition-all"
                  />
                  <button
                    onClick={() => {
                      setIsEditingName(false)
                      handleUpdateProfile(username, avatarUrl)
                    }}
                    className="p-2 bg-emerald-500 text-slate-950 rounded-lg hover:bg-emerald-600 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-900/40 border border-slate-850 rounded-xl py-2 px-3 text-sm text-slate-200">
                  <span className="font-bold">{username}</span>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-slate-500 hover:text-amber-500 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Địa chỉ Email</label>
              <div className="flex items-center gap-2 bg-slate-900/20 border border-slate-850/50 rounded-xl py-2 px-3 text-sm text-slate-400">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="font-mono text-xs">{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Quyền hạn tài khoản</label>
              <div className="flex items-center gap-2 bg-slate-900/20 border border-slate-850/50 rounded-xl py-2 px-3 text-sm text-slate-400">
                <Shield className="w-4 h-4 text-slate-500" />
                <span className="font-mono text-xs capitalize">{user?.role}</span>
              </div>
            </div>
          </div>

          <div className="w-full pt-4 border-t border-slate-850 flex flex-col gap-3">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/40 text-rose-400 font-semibold rounded-xl text-xs transition cursor-pointer font-mono"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              XÓA VĨNH VIỄN TÀI KHOẢN
            </button>
          </div>
        </div>

        {/* Middle & Right Column: Statistics & Achievements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <div className="glass-strong border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-amber-500" />
            <h3 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              TIẾN ĐỘ HỌC TẬP
            </h3>

            {loadingProgress ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Hoàn thành</span>
                    <span className="text-2xl font-bold font-display text-emerald-400 block mt-1">{coreCompletedCount} <span className="text-xs text-slate-500">/{totalLessons} ({completedIds.filter(id => id.startsWith('lab-')).length} lab)</span></span>
                    <BookOpen className="w-12 h-12 text-emerald-500/5 absolute right-2 bottom-2" />
                  </div>
                  <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Điểm Tích Lũy</span>
                    <span className="text-2xl font-bold font-display text-amber-400 block mt-1">{totalXP} <span className="text-[10px] text-slate-500 font-mono">XP</span></span>
                    <Zap className="w-12 h-12 text-amber-500/5 absolute right-2 bottom-2" />
                  </div>
                  <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Tỷ lệ tiến trình</span>
                    <span className="text-2xl font-bold font-display text-cyan-400 block mt-1">{Math.round(progressPercent)}%</span>
                    <Award className="w-12 h-12 text-cyan-500/5 absolute right-2 bottom-2" />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-bold">Thanh tiến độ</span>
                    <span className="text-amber-500 font-bold">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-850 p-0.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-emerald-400 rounded-full transition-all duration-500 shadow-md shadow-amber-500/20"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Auditor Rank */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${rank.color}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Cấp bậc kiểm toán hiện tại</span>
                      <span className="text-sm font-bold font-display">{rank.title}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">AUDITOR RANK</span>
                </div>
              </div>
            )}
          </div>

          {/* Completed Content List */}
          <div className="glass-strong border border-slate-850 rounded-2xl p-6">
            <h3 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-500" />
              NỘI DUNG ĐÃ HOÀN THÀNH
            </h3>

            {completedLessonsList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm italic bg-slate-900/20 border border-slate-850/50 rounded-xl">
                Bạn chưa hoàn thành bài học hoặc lab thực hành nào. Hãy bắt đầu học để cải thiện tiến độ nhé!
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {completedLessonsList.map((lesson, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl hover:border-slate-800 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center text-lg flex-shrink-0">
                        {lesson.icon || '🔗'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">BÀI HỌC {idx + 1}</span>
                        <h4 className="text-sm font-bold text-slate-200 truncate font-display">{lesson.title}</h4>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {lesson.labEnabled && (
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                          LAB DONE
                        </span>
                      )}
                      <span className="text-xs font-mono font-bold text-amber-500">+500 XP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

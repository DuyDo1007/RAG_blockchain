import React, { useState, useMemo, useEffect } from 'react'
import { BookOpen, Clock, Zap, Search, Filter, ChevronRight, Lock, FlaskConical, Star, GraduationCap, Trophy, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import GuestBanner from '../components/GuestBanner'
import CertificateModal from '../components/CertificateModal'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const categoryLabels = {
  'fundamentals': { label: 'Nền tảng', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  'smart-contracts': { label: 'Smart Contract', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  'vulnerabilities': { label: 'Lỗ hổng', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  'defi-security': { label: 'DeFi Security', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  'web3-security': { label: 'Web3 Security', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  'auditing': { label: 'Auditing', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
}

const difficultyConfig = {
  beginner: { label: 'Cơ bản', color: 'text-emerald-400', stars: 1 },
  intermediate: { label: 'Trung bình', color: 'text-amber-400', stars: 2 },
  advanced: { label: 'Nâng cao', color: 'text-rose-400', stars: 3 }
}

export default function LessonsPage({ onSelectLesson, onStartLab, refreshTrigger, lessons = [], onOpenLeaderboard }) {
  const { isGuest, user, logout, getGuestProgress } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'graph'
  const [showCertificate, setShowCertificate] = useState(false)

  // Progress States
  const [progress, setProgress] = useState(null)
  const [guestCompletedIds, setGuestCompletedIds] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(false)

  // Sync Guest progress from LocalStorage
  useEffect(() => {
    if (isGuest && getGuestProgress) {
      setGuestCompletedIds(getGuestProgress())
    }
  }, [isGuest, refreshTrigger, getGuestProgress])

  const categories = useMemo(() => {
    const cats = new Set(lessons.map(l => l.category || 'fundamentals').filter(Boolean))
    return ['all', ...Array.from(cats)]
  }, [lessons])

  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      const matchSearch = !searchQuery || 
        (lesson.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lesson.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === 'all' || lesson.category === selectedCategory
      const matchDifficulty = selectedDifficulty === 'all' || lesson.difficulty === selectedDifficulty
      return matchSearch && matchCategory && matchDifficulty
    })
  }, [lessons, searchQuery, selectedCategory, selectedDifficulty])

  // Fetch / Sync Progress
  useEffect(() => {
    if (isGuest || !user) return

    const fetchProgress = async () => {
      setLoadingProgress(true)
      try {
        const token = localStorage.getItem('access_token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        
        const userId = user.id || user._id
        const progressRes = await axios.get(`${API_BASE_URL}/roadmap/progress/${userId}`, { headers })
        
        if (progressRes.data && progressRes.data.length > 0) {
          setProgress(progressRes.data[0])
        } else {
          const roadmapRes = await axios.get(`${API_BASE_URL}/roadmap/beginner`, { headers })
          const roadmapId = roadmapRes.data.id || roadmapRes.data._id
          
          await axios.post(
            `${API_BASE_URL}/roadmap/progress/start?user_id=${userId}&roadmap_id=${roadmapId}`,
            {},
            { headers }
          )
          
          const refetchRes = await axios.get(`${API_BASE_URL}/roadmap/progress/${userId}`, { headers })
          if (refetchRes.data && refetchRes.data.length > 0) {
            setProgress(refetchRes.data[0])
          }
        }
      } catch (err) {
        console.error('Error fetching roadmap progress:', err)
      } finally {
        setLoadingProgress(false)
      }
    }

    fetchProgress()
  }, [isGuest, user, refreshTrigger])

  // Progress metrics calculation
  const rawCompleted = isGuest ? guestCompletedIds : (progress?.completed_lessons || [])
  const completedIds = rawCompleted.map(id => id ? id.replace('_', '-') : id)
  const coreCompletedCount = completedIds.filter(id => !id.startsWith('lab-')).length
  const totalLessons = lessons.length
  const progressPercent = totalLessons > 0 ? Math.min(100, (coreCompletedCount / totalLessons) * 100) : 0
  const totalXP = user?.xp || 0

  // Auditor Rank
  const auditorRank = useMemo(() => {
    if (progressPercent >= 81) return { title: 'Huyền thoại Security Lead', color: 'text-rose-400' }
    if (progressPercent >= 51) return { title: 'Senior Auditor Cao cấp', color: 'text-purple-400' }
    if (progressPercent >= 26) return { title: 'Chuyên viên Smart Contract', color: 'text-cyan-400' }
    return { title: 'Học viên Tập sự (Novice)', color: 'text-amber-500' }
  }, [progressPercent])

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-cyber-deep font-sans">
      {/* Guest Banner */}
      {isGuest && (
        <div className="p-4 sm:p-6 pb-0">
          <GuestBanner
            onLogin={() => logout()}
            onRegister={() => logout()}
          />
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && (
        <CertificateModal
          user={user}
          onClose={() => setShowCertificate(false)}
        />
      )}

      {/* Compact Combined Header (Rank, Progress, Title & Filters) */}
      <div className="py-4 px-6 md:px-8 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-[#0d1017] to-slate-950 flex-shrink-0">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
          {/* Left side: Icon, Title & Rank Badge */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-sm">
              <GraduationCap className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg md:text-xl font-bold text-slate-100 font-display">
                  Bài học Blockchain Security
                </h1>
                {!isGuest && user && (
                  <span className={`text-[11px] font-extrabold font-display px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 ${auditorRank.color}`}>
                    🏆 {auditorRank.title}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {lessons.length} bài học • {lessons.filter(l => l.labEnabled).length} bài thực hành {!isGuest && user && <span>• Tích lũy: <strong className="text-amber-400">{totalXP} XP</strong></span>}
              </p>
            </div>
          </div>

          {/* Right side: Compact Progress Gauge & Certificate Button */}
          {!isGuest && user && (
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-full md:w-64 bg-slate-900/60 border border-slate-850 px-3.5 py-2 rounded-xl relative overflow-hidden backdrop-blur-md">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="text-slate-400 uppercase tracking-wider">Tiến trình học tập</span>
                  <span className="text-amber-400 font-bold">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850 relative">
                  <div 
                    className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {progressPercent >= 50 && (
                <button
                  onClick={() => setShowCertificate(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 rounded-xl font-bold text-xs font-mono transition shadow-md flex items-center gap-1.5 flex-shrink-0"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Chứng Nhận</span>
                </button>
              )}

              {onOpenLeaderboard && (
                <button
                  onClick={onOpenLeaderboard}
                  className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-750 text-amber-400 rounded-xl font-bold text-xs font-display transition shadow-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                  title="Xem Bảng Xếp Hạng Hào Quang"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Xếp Hạng</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Search & Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài học..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs md:text-sm text-slate-100 placeholder-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:border-amber-500/50 transition-all cursor-pointer"
            >
              <option value="all">Tất cả chủ đề</option>
              {categories.filter(c => c && c !== 'all').map((cat, idx) => (
                <option key={`cat-option-${cat}-${idx}`} value={cat}>{categoryLabels[cat]?.label || cat}</option>
              ))}
            </select>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:border-amber-500/50 transition-all cursor-pointer"
            >
              <option value="all">Tất cả cấp độ</option>
              <option value="beginner">Cơ bản</option>
              <option value="intermediate">Trung bình</option>
              <option value="advanced">Nâng cao</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {filteredLessons.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-display">Không tìm thấy bài học</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-7xl mx-auto">
            {filteredLessons.map((lesson, index) => {
              const catConfig = categoryLabels[lesson.category] || { label: lesson.category, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
              const diffConfig = difficultyConfig[lesson.difficulty] || difficultyConfig.beginner
              const normLessonId = lesson.id ? lesson.id.replace('_', '-') : ''
              const isCompleted = completedIds.includes(normLessonId)

              return (
                <div
                  key={`lesson-card-${lesson.id || index}-${index}`}
                  onClick={() => onSelectLesson && onSelectLesson(lesson)}
                  className={`group relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:-translate-y-0.5 ${
                    isCompleted
                      ? 'border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40 hover:shadow-emerald-500/5'
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-amber-500/30 hover:shadow-amber-500/5'
                  }`}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
                    isCompleted
                      ? 'from-emerald-500/5 via-transparent to-teal-500/5'
                      : 'from-amber-500/5 via-transparent to-cyan-500/5'
                  }`} />
                  
                  <div className="relative p-5">
                    {/* Top Row: Index + Category */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{lesson.icon}</span>
                        <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          BÀI {lessons.indexOf(lesson) + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-550/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                            <ShieldCheck className="w-3 h-3" /> ĐÃ HỌC
                          </span>
                        )}
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${catConfig.color}`}>
                          {catConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={`text-base font-bold font-display transition-colors line-clamp-1 mb-2 ${
                      isCompleted 
                        ? 'text-emerald-350 group-hover:text-emerald-400' 
                        : 'text-slate-100 group-hover:text-amber-400'
                    }`}>
                      {lesson.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed font-sans">
                      {lesson.description}
                    </p>

                    {/* Meta Row */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-850">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          {lesson.duration_minutes}p
                        </span>
                        <span className={`flex items-center gap-1 ${diffConfig.color}`}>
                          {Array.from({ length: diffConfig.stars }).map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-current" />
                          ))}
                          {diffConfig.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {lesson.labEnabled && (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold">
                            <FlaskConical className="w-3 h-3" />
                            Lab
                          </span>
                        )}
                        {lesson.quiz_questions && (
                          <span className="text-purple-400 font-bold">
                            {lesson.quiz_questions.length} quiz
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lab Button for non-guest */}
                    {lesson.labEnabled && !isGuest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartLab && onStartLab(lesson)
                        }}
                        className={`mt-3 w-full py-2 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isCompleted
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-550/20 text-emerald-400'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-550/20 text-amber-550'
                        }`}
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        {isCompleted ? 'Làm lại Lab thực hành' : 'Bắt đầu Lab thực hành'}
                      </button>
                    )}

                    {/* Guest lock indicator */}
                    {lesson.labEnabled && isGuest && (
                      <div className="mt-3 w-full py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-500 text-xs font-mono text-center flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Đăng nhập để thực hành Lab
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

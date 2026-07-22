import React, { useState, useMemo, useEffect } from 'react'
import axios from 'axios'
import { FlaskConical, ArrowLeft, Search, Clock, Zap, Star, BookOpen, ChevronRight, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { lessonsData, standaloneLabsData } from '../data/lessonsData'
import LabWorkspace from '../components/LabWorkspace'

const difficultyConfig = {
  beginner: { label: 'Cơ bản', color: 'text-emerald-400', stars: 1 },
  intermediate: { label: 'Trung bình', color: 'text-amber-400', stars: 2 },
  advanced: { label: 'Nâng cao', color: 'text-rose-400', stars: 3 }
}

const categoryConfig = {
  attack: { label: 'Tấn công', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  defi: { label: 'DeFi', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  audit: { label: 'Audit', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  analysis: { label: 'Phân tích', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  defense: { label: 'Phòng thủ', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
}

export default function LabRunnerPage({ lessons = lessonsData, refreshTrigger, onStartLab }) {
  const { isGuest, user, getGuestProgress, completeGuestLesson } = useAuth()
  const [activeLab, setActiveLab] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [progress, setProgress] = useState(null)
  const [guestCompletedIds, setGuestCompletedIds] = useState([])

  useEffect(() => {
    if (isGuest && getGuestProgress) {
      setGuestCompletedIds(getGuestProgress())
    }
  }, [isGuest, refreshTrigger, getGuestProgress])

  useEffect(() => {
    if (isGuest || !user) return
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const userId = user.id || user._id
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/roadmap/progress/${userId}`, { headers })
        if (res.data && res.data.length > 0) {
          setProgress(res.data[0])
        }
      } catch (err) {
        console.error('Error fetching progress in LabRunnerPage:', err)
      }
    }
    fetchProgress()
  }, [isGuest, user, refreshTrigger])

  const rawCompleted = isGuest ? guestCompletedIds : (progress?.completed_lessons || [])
  const completedIds = rawCompleted.map(id => id ? id.replace('_', '-') : id)

  // Combine lesson labs and standalone labs
  const allLabs = useMemo(() => {
    const lessonLabs = lessons
      .filter(l => l.labEnabled)
      .map(l => ({
        id: l.id,
        title: l.labTitle || `Lab: ${l.title}`,
        description: l.labDescription || l.description,
        difficulty: l.difficulty,
        category: standaloneLabsData.find(s => s.relatedLessonId === l.id)?.category || 'general',
        icon: l.icon,
        estimatedMinutes: l.duration_minutes,
        lessonData: l,
      }))
    return lessonLabs
  }, [lessons])

  const filteredLabs = useMemo(() => {
    return allLabs.filter(lab => {
      const matchSearch = !searchQuery || 
        lab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lab.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = selectedCategory === 'all' || lab.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [allLabs, searchQuery, selectedCategory])

  // If guest, show access denied
  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-cyber-deep text-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-slate-900/60 border border-slate-700 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-200 font-display mb-2">Cần đăng nhập để truy cập Lab</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Phần thực hành Lab yêu cầu tài khoản User hoặc Admin. Vui lòng đăng nhập hoặc đăng ký để bắt đầu.
        </p>
      </div>
    )
  }

  // If a lab is active, show LabWorkspace
  if (activeLab) {
    return (
      <LabWorkspace
        lesson={activeLab.lessonData}
        onClose={() => setActiveLab(null)}
        onComplete={async () => {
          setActiveLab(null)
          const normLessonId = activeLab.id ? activeLab.id.replace('_', '-') : ''
          const normLabId = normLessonId.startsWith('lab-') ? normLessonId : `lab-${normLessonId}`
          if (isGuest && completeGuestLesson) {
            completeGuestLesson(normLabId)
            if (!normLessonId.startsWith('lab-')) completeGuestLesson(normLessonId)
            if (getGuestProgress) setGuestCompletedIds(getGuestProgress())
          } else if (user) {
            try {
              const token = localStorage.getItem('access_token')
              const headers = token ? { Authorization: `Bearer ${token}` } : {}
              await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/roadmap/progress/current/complete-lesson?lesson_id=${normLabId}`, {}, { headers })
              if (!normLessonId.startsWith('lab-')) {
                await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/roadmap/progress/current/complete-lesson?lesson_id=${normLessonId}`, {}, { headers })
              }
              const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/roadmap/progress/${user.id || user._id}`, { headers })
              if (res.data && res.data.length > 0) setProgress(res.data[0])
            } catch (err) {
              console.error('Error auto-completing lab in LabRunnerPage:', err)
            }
          }
        }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-cyber-deep font-sans">
      {/* Header */}
      <div className="p-6 md:px-8 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 font-display">
              Lab Thực Hành
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              {allLabs.length} bài thực hành • Hands-on Blockchain Security
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm lab..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono focus:border-emerald-500/50 transition-all cursor-pointer"
          >
            <option value="all">Tất cả loại</option>
            {Object.entries(categoryConfig).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Labs Grid */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {filteredLabs.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-display">Không tìm thấy lab</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-7xl mx-auto">
            {filteredLabs.map((lab) => {
              const diffConfig = difficultyConfig[lab.difficulty] || difficultyConfig.beginner
              const catConfig = categoryConfig[lab.category] || { label: lab.category, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
              const normLabId = lab.id ? lab.id.replace('_', '-') : ''
              const labSpecificId = normLabId.startsWith('lab-') ? normLabId : `lab-${normLabId}`
              const isCompleted = completedIds.includes(labSpecificId) || completedIds.includes(normLabId)

              return (
                <div
                  key={lab.id}
                  onClick={() => {
                    if (onStartLab && !isGuest) {
                      onStartLab(lab.lessonData)
                    } else {
                      setActiveLab(lab)
                    }
                  }}
                  className={`group relative rounded-2xl border backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-xl hover:-translate-y-0.5 ${
                    isCompleted 
                      ? 'border-emerald-500/40 bg-slate-900/60 shadow-md shadow-emerald-500/5' 
                      : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-emerald-500/30 hover:shadow-emerald-500/5'
                  }`}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  <div className="relative p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{lab.icon}</span>
                        {isCompleted && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-550/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 shadow-sm">
                            <ShieldCheck className="w-3 h-3" /> ĐÃ HỌC
                          </span>
                        )}
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${catConfig.color}`}>
                          {catConfig.label}
                        </span>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-mono font-bold ${diffConfig.color}`}>
                        {Array.from({ length: diffConfig.stars }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-current" />
                        ))}
                        {diffConfig.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100 font-display group-hover:text-emerald-400 transition-colors line-clamp-1 mb-2">
                      {lab.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {lab.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                      <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        ~{lab.estimatedMinutes}p
                      </span>
                      <button className={`flex items-center gap-1 text-[11px] font-mono font-bold transition ${
                        isCompleted ? 'text-emerald-400 group-hover:text-emerald-300' : 'text-emerald-400 group-hover:text-emerald-300'
                      }`}>
                        {isCompleted ? 'Làm lại Lab' : 'Bắt đầu Lab'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
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

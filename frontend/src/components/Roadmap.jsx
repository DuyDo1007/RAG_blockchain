import React, { useState, useEffect } from 'react'
import { CheckCircle, Circle, BookOpen, Clock, Zap, Trophy, ChevronRight, X, ExternalLink, Target } from 'lucide-react'
import axios from 'axios'

const RoadmapView = ({ userId }) => {
  const [roadmap, setRoadmap] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  useEffect(() => {
    loadRoadmap()
  }, [])

  const loadRoadmap = async () => {
    setLoading(true)
    try {
      // Load beginner roadmap
      const roadmapRes = await axios.get(`${API_BASE_URL}/roadmap/beginner`)
      setRoadmap(roadmapRes.data)

      // Try to load user progress
      const progressRes = await axios.get(`${API_BASE_URL}/roadmap/progress/${userId}`)
      if (progressRes.data && progressRes.data.length > 0) {
        setProgress(progressRes.data[0])
      }
    } catch (error) {
      console.error('Error loading roadmap:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartRoadmap = async () => {
    if (!roadmap) return
    try {
      const res = await axios.post(
        `${API_BASE_URL}/roadmap/progress/start?user_id=${userId}&roadmap_id=${roadmap.roadmap_id}`
      )
      setProgress({ ...res.data, roadmap_id: roadmap.roadmap_id })
    } catch (error) {
      console.error('Error starting roadmap:', error)
    }
  }

  const handleCompleteLesson = async (lessonId) => {
    if (!progress) return
    try {
      const res = await axios.put(
        `${API_BASE_URL}/roadmap/progress/${progress.progress_id}/complete-lesson?lesson_id=${lessonId}`
      )
      setProgress(res.data)
    } catch (error) {
      console.error('Error completing lesson:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-fade-in">
          <div className="flex justify-center space-x-2 mb-4">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
          <p className="text-slate-400 text-sm">Đang tải lộ trình...</p>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-rose-400" />
          </div>
          <p className="text-rose-400 font-medium">Không thể tải lộ trình học</p>
          <p className="text-slate-500 text-sm mt-1">Vui lòng thử lại sau</p>
        </div>
      </div>
    )
  }

  const progressPercent = progress?.progress_percentage || 0
  const completedCount = progress?.completed_lessons?.length || 0
  const totalLessons = roadmap.lessons?.length || 0

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">{roadmap.title}</h1>
        </div>
        <p className="text-slate-400 leading-relaxed">{roadmap.description}</p>
      </div>

      {/* Progress Card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Trophy className={`w-5 h-5 ${progressPercent === 100 ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="font-semibold text-slate-200">Tiến độ học tập</span>
          </div>
          <span className="text-2xl font-bold gradient-text">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">{completedCount} / {totalLessons} bài học hoàn thành</p>
      </div>

      {/* Start Button */}
      {!progress && (
        <button
          onClick={handleStartRoadmap}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-neon-emerald hover:shadow-lg flex items-center justify-center space-x-2"
        >
          <Zap className="w-5 h-5" />
          <span>Bắt đầu lộ trình học</span>
        </button>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 text-center hover:border-cyan-500/20 transition-all duration-200">
          <BookOpen className="w-6 h-6 text-cyan-400 mx-auto mb-3" />
          <p className="text-2xl font-bold text-slate-100">{totalLessons}</p>
          <p className="text-xs text-slate-400 mt-1">Bài học</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center hover:border-purple-500/20 transition-all duration-200">
          <Clock className="w-6 h-6 text-purple-400 mx-auto mb-3" />
          <p className="text-2xl font-bold text-slate-100">{roadmap.estimated_duration_hours}</p>
          <p className="text-xs text-slate-400 mt-1">Giờ</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center hover:border-emerald-500/20 transition-all duration-200">
          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
          <p className="text-2xl font-bold text-slate-100">{completedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Hoàn thành</p>
        </div>
      </div>

      {/* Lessons List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="font-semibold text-slate-200 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Các bài học</span>
          </h2>
        </div>
        <div className="divide-y divide-white/5">
          {roadmap.lessons?.map((lesson, idx) => {
            const isCompleted = progress?.completed_lessons?.includes(lesson.id) || false
            return (
              <div
                key={lesson.id}
                className="px-6 py-4 hover:bg-white/[0.02] cursor-pointer transition-all duration-200 group"
                onClick={() => setSelectedLesson(lesson)}
              >
                <div className="flex items-start space-x-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (progress) handleCompleteLesson(lesson.id)
                    }}
                    className="mt-0.5 flex-shrink-0 transition-transform duration-200 hover:scale-110"
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {idx + 1}. {lesson.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lesson.description}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="flex items-center space-x-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{lesson.duration_minutes} phút</span>
                      </span>
                      <span className="px-2 py-0.5 bg-white/5 text-slate-400 text-xs rounded-full border border-white/5">
                        {lesson.difficulty}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 mt-1 flex-shrink-0 transition-colors" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setSelectedLesson(null)}
        >
          <div
            className="glass-strong rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-slate-100">{selectedLesson.title}</h3>
              <button
                onClick={() => setSelectedLesson(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-300 leading-relaxed">{selectedLesson.description}</p>
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>{selectedLesson.duration_minutes} phút</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>{selectedLesson.difficulty}</span>
                </div>
              </div>
              {selectedLesson.resources && selectedLesson.resources.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                  <p className="font-semibold text-slate-200 mb-3 flex items-center space-x-2">
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                    <span>Tài nguyên</span>
                  </p>
                  <ul className="space-y-2">
                    {selectedLesson.resources.map((res, i) => (
                      <li key={i} className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 cursor-pointer text-sm transition-colors">
                        <ChevronRight className="w-3 h-3" />
                        <span>{res}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-white/5">
              <button
                onClick={() => setSelectedLesson(null)}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoadmapView

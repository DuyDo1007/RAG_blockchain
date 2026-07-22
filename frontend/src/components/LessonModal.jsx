import React, { useState, useEffect } from 'react'
import { X, Clock, Zap, BookOpen, ExternalLink, ChevronRight, CheckCircle, Sparkles, Loader2, AlertTriangle, Lock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function LessonModal({ lesson, isCompleted, onClose, onStartQuiz, onStartLab }) {
  const [markdownContent, setMarkdownContent] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (lesson) {
      fetchLessonContent(lesson.id)
    }
  }, [lesson])

  const fetchLessonContent = async (lessonId) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API_BASE_URL}/roadmap/lesson-content/${lessonId}`, { headers })
      if (res.data && res.data.markdown_content) {
        setMarkdownContent(res.data.markdown_content)
      } else {
        setMarkdownContent(`# ${lesson.title}\n\n${lesson.description}`)
      }
    } catch (error) {
      console.error('Error fetching lesson content:', error)
      setMarkdownContent(`# ${lesson.title}\n\n${lesson.description}\n\n*(Nội dung chi tiết đang được đồng bộ...)*`)
    } finally {
      setLoading(false)
    }
  }

  if (!lesson) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-800 animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">
                  Bài học
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                     <CheckCircle className="w-3 h-3" /> ĐÃ HOÀN THÀNH
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-100 font-display">
                {lesson.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-900 rounded-xl transition text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta Info Bar */}
        <div className="px-6 py-3 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Thời gian: <strong className="text-slate-200">{lesson.duration_minutes} phút</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Độ khó: <strong className="text-amber-400 uppercase">{lesson.difficulty}</strong></span>
            </span>
          </div>
          {lesson.quiz_questions && (
            <span className="text-slate-300">
              Trắc nghiệm: <strong className="text-emerald-400">{lesson.quiz_questions.length} câu hỏi</strong>
            </span>
          )}
        </div>

        {/* Markdown Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-950/30">
          {user && user.role === 'guest' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center shadow-lg shadow-amber-500/5">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold font-display text-slate-100">Nội Dung Đang Bị Khóa</h3>
              <p className="text-sm text-slate-450 leading-relaxed font-sans">
                Bạn đang duyệt với tư cách <strong>Khách</strong>. Vui lòng đăng ký hoặc đăng nhập tài khoản học viên để mở khóa toàn bộ nội dung lý thuyết, câu hỏi trắc nghiệm và phòng thực hành Solidity Lab.
              </p>
              <button
                onClick={() => {
                  onClose()
                  localStorage.removeItem('access_token')
                  localStorage.removeItem('refresh_token')
                  window.location.reload()
                }}
                className="px-6 py-3 bg-gradient-to-r from-vault-gold to-amber-600 hover:brightness-110 text-slate-950 font-bold rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-vault-gold/15"
              >
                Đăng ký / Đăng nhập Ngay
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="font-mono text-sm">Đang tải kiến thức từ Blockchain Academy...</p>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <div className="my-4 rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                          <span>{match[1].toUpperCase()}</span>
                          <span className="text-slate-600">Blockchain Academy Snippet</span>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '1rem', background: '#080a0f', fontSize: '0.825rem' }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400 font-mono text-xs border border-slate-800" {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {markdownContent}
              </ReactMarkdown>

              {lesson.resources && lesson.resources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display flex items-center gap-2 mb-3">
                    <ExternalLink className="w-4 h-4 text-amber-500" />
                    <span>Tài liệu & Liên kết tham khảo</span>
                  </h4>
                  <ul className="space-y-2 list-none pl-0">
                    {lesson.resources.map((res, i) => {
                      const parts = res.split('|')
                      const label = parts[0]?.trim()
                      const url = parts[1]?.trim()
                      return (
                        <li key={i} className="flex items-center gap-2 text-sm font-mono">
                          <ChevronRight className="w-4 h-4 text-amber-500" />
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 hover:underline transition"
                            >
                              {label}
                            </a>
                          ) : (
                            <span className="text-slate-300">{label}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 font-semibold rounded-xl text-sm transition border border-slate-800"
          >
            Đóng
          </button>

          {user && user.role === 'guest' ? (
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
              <Lock className="w-3.5 h-3.5 text-amber-500/60" /> Đăng nhập để làm Quiz & thực hành Lab
            </span>
          ) : (
            <div className="flex items-center gap-3">
              {lesson.labEnabled && (
                <button
                  onClick={() => onStartLab(lesson)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 hover:brightness-110 text-slate-100 font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 active:scale-95 border border-cyan-500/30"
                >
                  <Zap className="w-4 h-4 text-cyan-300 animate-pulse" />
                  <span>Thực hành Lab (Interactive Lab)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {lesson.quiz_questions && lesson.quiz_questions.length > 0 && (
                <button
                  onClick={() => onStartQuiz(lesson)}
                  className="flex items-center gap-2.5 px-6 py-2.5 bg-gradient-to-r from-vault-gold via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold rounded-xl text-sm transition shadow-md shadow-vault-gold/20 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu Trắc nghiệm ({lesson.quiz_questions.length} câu)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { CheckCircle, Circle, BookOpen, Clock, Zap, Trophy, ChevronRight, X, ExternalLink, Target, LayoutGrid, ListFilter, Sparkles, Play } from 'lucide-react'
import ReactFlow, { Background, Controls, MarkerType, Handle, Position } from 'reactflow'
import axios from 'axios'
import LessonModal from './LessonModal'
import QuizModal from './QuizModal'
import LabWorkspace from './LabWorkspace'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Custom Node Component for ReactFlow Graph
function LessonNode({ data }) {
  const { lesson, idx, isCompleted, isCurrent, onSelect } = data
  
  let borderStyle = 'border-slate-900 bg-slate-950/40 text-slate-550 opacity-60'
  let glowStyle = ''
  
  if (isCompleted) {
    borderStyle = 'border-emerald-500/30 bg-emerald-950/10 text-emerald-300 shadow-md shadow-emerald-500/5'
  } else if (isCurrent) {
    borderStyle = 'border-amber-500/80 bg-slate-950/80 text-slate-100 ring-1 ring-amber-500/30'
    glowStyle = 'shadow-xl shadow-amber-500/10'
  }

  return (
    <div
      onClick={() => onSelect(lesson)}
      className={`w-[270px] p-5 rounded-2xl border transition-all duration-300 cursor-pointer select-none group ${borderStyle} ${glowStyle} hover:scale-102 hover:border-amber-500/50`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500/80 !w-2.5 !h-2.5 !border-2 !border-[#06080d] !transition-transform group-hover:scale-125" />
      
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="px-2 py-0.5 rounded bg-slate-900/60 border border-slate-800/80 text-[10px] font-mono font-bold text-amber-500">
          BÀI {idx + 1}
        </span>
        {isCompleted ? (
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : isCurrent ? (
          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
            <Play className="w-2.5 h-2.5 fill-amber-400" /> ĐANG HỌC
          </span>
        ) : (
          <Circle className="w-5 h-5 text-slate-600 flex-shrink-0" />
        )}
      </div>

      <h4 className="font-bold text-sm text-slate-100 font-display line-clamp-1 group-hover:text-amber-400 transition">
        {lesson.title}
      </h4>
      <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-sans">
        {lesson.description}
      </p>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-900 text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{lesson.duration_minutes}p</span>
        </span>
        <span className="uppercase text-slate-450 bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-800">
          {lesson.difficulty}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500/80 !w-2.5 !h-2.5 !border-2 !border-[#06080d] !transition-transform group-hover:scale-125" />
    </div>
  )
}

const nodeTypes = {
  lessonNode: LessonNode
}

export default function RoadmapView({ userId }) {
  const [roadmap, setRoadmap] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('graph') // 'graph' | 'list'
  
  // Modal states
  const [activeLessonModal, setActiveLessonModal] = useState(null)
  const [activeQuizModal, setActiveQuizModal] = useState(null)
  const [activeLab, setActiveLab] = useState(null)

  useEffect(() => {
    loadRoadmap()
  }, [])

  const loadRoadmap = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const roadmapRes = await axios.get(`${API_BASE_URL}/roadmap/beginner`, { headers })
      setRoadmap(roadmapRes.data)

      const progressRes = await axios.get(`${API_BASE_URL}/roadmap/progress/${userId}`, { headers })
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
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const res = await axios.post(
        `${API_BASE_URL}/roadmap/progress/start?user_id=${userId}&roadmap_id=${roadmap.id}`,
        {},
        { headers }
      )
      setProgress({ ...res.data, roadmap_id: roadmap.id })
    } catch (error) {
      console.error('Error starting roadmap:', error)
    }
  }

  const handleCompleteLesson = async (lessonId) => {
    if (!progress) return
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const res = await axios.put(
        `${API_BASE_URL}/roadmap/progress/${progress.progress_id}/complete-lesson?lesson_id=${lessonId}`,
        {},
        { headers }
      )
      setProgress(res.data)
    } catch (error) {
      console.error('Error completing lesson:', error)
    }
  }

  // Generate ReactFlow Nodes & Edges dynamically from lessons
  const { nodes, edges } = useMemo(() => {
    if (!roadmap || !roadmap.lessons) return { nodes: [], edges: [] }

    const completedIds = progress?.completed_lessons || []
    const generatedNodes = []
    const generatedEdges = []

    // Layout in a serpentine or vertical flow
    const cols = 2
    const xGap = 320
    const yGap = 180

    roadmap.lessons.forEach((lesson, idx) => {
      const isCompleted = completedIds.includes(lesson.id)
      const isCurrent = !isCompleted && (idx === 0 || completedIds.includes(roadmap.lessons[idx - 1]?.id))
      
      // Calculate position
      const row = Math.floor(idx / cols)
      const col = idx % cols
      // Alternating serpentine direction for cool visual
      const xPos = row % 2 === 0 ? col * xGap : (cols - 1 - col) * xGap
      const yPos = row * yGap

      generatedNodes.push({
        id: lesson.id,
        type: 'lessonNode',
        position: { x: xPos, y: yPos },
        data: {
          lesson,
          idx,
          isCompleted,
          isCurrent,
          onSelect: (les) => setActiveLessonModal(les)
        }
      })

      if (idx > 0) {
        const prevId = roadmap.lessons[idx - 1].id
        const isPrevCompleted = completedIds.includes(prevId)
        generatedEdges.push({
          id: `e-${prevId}-${lesson.id}`,
          source: prevId,
          target: lesson.id,
          type: 'smoothstep',
          animated: isPrevCompleted,
          style: {
            stroke: isPrevCompleted ? '#10b981' : '#df9a28',
            strokeWidth: 2.5
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isPrevCompleted ? '#10b981' : '#df9a28'
          }
        })
      }
    })

    return { nodes: generatedNodes, edges: generatedEdges }
  }, [roadmap, progress])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="text-center animate-fade-in space-y-3">
          <div className="flex justify-center space-x-2">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
          <p className="text-slate-400 text-sm font-mono">Đang đồng bộ lộ trình Blockchain Academy...</p>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
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
    <div className="flex flex-col h-full w-full overflow-hidden bg-cyber-deep font-sans">
      {/* Top Banner Summary */}
      <div className="p-6 md:px-8 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 z-10 flex-shrink-0">
        <div className="max-w-2xl">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 font-display">
              {roadmap.title}
            </h1>
          </div>
          <p className="text-slate-400 text-xs md:text-sm leading-relaxed line-clamp-2">
            {roadmap.description}
          </p>
        </div>

        {/* Progress gauge and view mode toggles */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">Tiến độ lộ trình</span>
              <span className="text-base font-black text-amber-400 font-mono">
                {completedCount} / {totalLessons} bài ({Math.round(progressPercent)}%)
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center relative">
              <Trophy className={`w-5 h-5 ${progressPercent === 100 ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'graph'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sơ đồ ReactFlow</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Start Roadmap Button if no progress */}
      {!progress && (
        <div className="px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs md:text-sm text-amber-300 font-mono">
          <span>Khám phá và bấm nút để bắt đầu lưu tiến độ học tập Blockchain của bạn ngay!</span>
          <button
            onClick={handleStartRoadmap}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition shadow-md shadow-amber-500/20"
          >
            Bắt đầu lộ trình
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'graph' ? (
          <div className="w-full h-full bg-[#06080d]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.3}
              maxZoom={1.5}
            >
              <Background gap={24} size={1} color="#1e293b" />
              <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300 !rounded-xl overflow-hidden !shadow-xl" />
            </ReactFlow>
          </div>
        ) : (
          /* List View */
          <div className="w-full h-full overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto space-y-4">
            {roadmap.lessons?.map((les, idx) => {
              const isCompleted = progress?.completed_lessons?.includes(les.id) || false
              const isCurrent = !isCompleted && (idx === 0 || progress?.completed_lessons?.includes(roadmap.lessons[idx - 1]?.id))
              
              return (
                <div
                  key={les.id}
                  onClick={() => setActiveLessonModal(les)}
                  className={`p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 group ${
                    isCompleted
                      ? 'border-slate-800/80 bg-slate-900/30 text-slate-400'
                      : isCurrent
                      ? 'border-amber-500/50 bg-slate-900/90 text-slate-100 shadow-lg shadow-amber-500/5'
                      : 'border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center">
                        <Play className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-mono font-bold text-amber-500 uppercase">Bài {idx + 1}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                        {les.difficulty}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 font-display group-hover:text-amber-400 transition">
                      {les.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {les.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{les.duration_minutes} phút</span>
                      </span>
                      {les.quiz_questions && (
                        <span>
                          Trắc nghiệm: <strong className="text-emerald-400">{les.quiz_questions.length} câu</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-500 flex-shrink-0 self-center transition" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {activeLessonModal && !activeQuizModal && !activeLab && (
        <LessonModal
          lesson={activeLessonModal}
          isCompleted={progress?.completed_lessons?.includes(activeLessonModal.id)}
          onClose={() => setActiveLessonModal(null)}
          onStartQuiz={(les) => setActiveQuizModal(les)}
          onStartLab={(les) => {
            setActiveLab(les)
            setActiveLessonModal(null)
          }}
        />
      )}

      {activeLab && (
        <LabWorkspace
          lesson={activeLab}
          onClose={() => setActiveLab(null)}
          onComplete={async () => {
            await handleCompleteLesson(activeLab.id)
            setActiveLab(null)
          }}
        />
      )}

      {activeQuizModal && (
        <QuizModal
          lesson={activeQuizModal}
          onClose={() => {
            setActiveQuizModal(null)
            setActiveLessonModal(null)
          }}
          onBackToLesson={() => setActiveQuizModal(null)}
          onCompleteLesson={async (lessonId) => {
            await handleCompleteLesson(lessonId)
          }}
        />
      )}
    </div>
  )
}

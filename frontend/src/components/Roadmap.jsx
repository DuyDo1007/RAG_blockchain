import React, { useState, useEffect } from 'react'
import { CheckCircle, Circle, BookOpen, Clock, Zap, Trophy, ChevronRight, X, ExternalLink, Target } from 'lucide-react'
import axios from 'axios'

const RoadmapView = ({ userId }) => {
  const [roadmap, setRoadmap] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  
  // Quiz states
  const [quizMode, setQuizMode] = useState(false)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [quizError, setQuizError] = useState(null)
  const [quizSuccess, setQuizSuccess] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  useEffect(() => {
    loadRoadmap()
  }, [])

  useEffect(() => {
    // Reset quiz states when selected lesson changes
    setQuizMode(false)
    setCurrentQuestionIdx(0)
    setSelectedAnswer(null)
    setQuizError(null)
    setQuizSuccess(false)
    setQuizCompleted(false)
  }, [selectedLesson])

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
    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-fade-in font-sans">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 font-display">{roadmap.title}</h1>
        </div>
        <p className="text-slate-400 leading-relaxed text-sm">{roadmap.description}</p>
      </div>

      {/* Progress Card */}
      <div className="glass rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Trophy className={`w-5 h-5 ${progressPercent === 100 ? 'text-amber-500' : 'text-slate-500'}`} />
            <span className="font-semibold text-slate-200 font-display text-sm uppercase tracking-wider">Tiến độ học tập</span>
          </div>
          <span className="text-2xl font-black text-amber-500 font-mono">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-3 bg-slate-955 rounded-full overflow-hidden border border-slate-800 p-[2px]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-vault-gold to-amber-500 transition-all duration-550 shadow-inner"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2.5 font-mono">{completedCount} / {totalLessons} bài học hoàn thành</p>
      </div>

      {/* Start Button */}
      {!progress && (
        <button
          onClick={handleStartRoadmap}
          className="w-full bg-gradient-to-r from-vault-gold to-amber-600 text-slate-955 font-bold py-3.5 rounded-xl transition-all duration-300 shadow-md shadow-vault-gold/15 hover:brightness-110 flex items-center justify-center space-x-2"
        >
          <Zap className="w-5 h-5" />
          <span>Bắt đầu lộ trình học</span>
        </button>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 text-center hover:border-amber-500/20 transition-all duration-200">
          <BookOpen className="w-6 h-6 text-amber-500 mx-auto mb-3" />
          <p className="text-2xl font-bold text-slate-100 font-display">{totalLessons}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Bài học</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center hover:border-amber-500/20 transition-all duration-200">
          <Clock className="w-6 h-6 text-cyan-400 mx-auto mb-3" />
          <p className="text-2xl font-bold text-slate-100 font-display">{roadmap.estimated_duration_hours}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Giờ</p>
        </div>
        <div className="glass rounded-2xl p-5 text-center hover:border-emerald-500/20 transition-all duration-200">
          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
          <p className="text-2xl font-bold text-slate-100 font-display">{completedCount}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Hoàn thành</p>
        </div>
      </div>

      {/* Lessons List */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <h2 className="font-semibold text-slate-200 flex items-center space-x-2 font-display text-sm uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Các bài học</span>
          </h2>
        </div>
        <div className="divide-y divide-slate-850">
          {roadmap.lessons?.map((lesson, idx) => {
            const isCompleted = progress?.completed_lessons?.includes(lesson.id) || false
            return (
              <div
                key={lesson.id}
                className="px-6 py-5 hover:bg-slate-900/20 cursor-pointer transition-all duration-200 group border-l-2 border-l-transparent hover:border-l-amber-500"
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
                    <p className={`font-semibold text-sm ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {idx + 1}. {lesson.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lesson.description}</p>
                    <div className="flex items-center space-x-3 mt-2.5">
                      <span className="flex items-center space-x-1 text-xs text-slate-500 font-mono">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{lesson.duration_minutes} phút</span>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider rounded border border-slate-800">
                        {lesson.difficulty}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 mt-1 flex-shrink-0 transition-colors" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setSelectedLesson(null)}
        >
          <div
            className="glass-strong rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto animate-slide-up border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-lg font-bold text-slate-100 font-display">
                {quizMode ? `Trắc nghiệm: ${selectedLesson.title}` : selectedLesson.title}
              </h3>
              <button
                onClick={() => setSelectedLesson(null)}
                className="p-2 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {quizMode ? (
              <div className="p-6 space-y-6">
                {quizCompleted ? (
                  <div className="text-center space-y-4 py-8 animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-100 font-display">Chúc mừng bạn đã hoàn thành!</h4>
                    <p className="text-slate-400 text-sm">
                      Bạn đã trả lời chính xác tất cả {selectedLesson.quiz_questions?.length || 0} câu hỏi trắc nghiệm của bài học này.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedLesson(null);
                      }}
                      className="mt-6 px-6 py-2.5 bg-gradient-to-r from-vault-gold to-amber-600 text-slate-955 font-bold rounded-xl transition shadow-md shadow-vault-gold/15"
                    >
                      Tuyệt vời, quay lại lộ trình
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Header Quiz */}
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                      <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase font-display">Kiểm tra kiến thức</span>
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-xs font-mono font-bold">
                        Câu {currentQuestionIdx + 1} / {selectedLesson.quiz_questions?.length || 0}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="text-slate-200 font-semibold text-base leading-relaxed">
                      {selectedLesson.quiz_questions && selectedLesson.quiz_questions[currentQuestionIdx]?.question}
                    </p>

                    {/* Options List */}
                    <div className="space-y-3">
                      {selectedLesson.quiz_questions && selectedLesson.quiz_questions[currentQuestionIdx]?.options.map((option, oIdx) => {
                        const isSelected = selectedAnswer === oIdx;
                        const isCorrectAnswer = oIdx === selectedLesson.quiz_questions[currentQuestionIdx]?.correct_answer;
                        
                        let btnStyle = "border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/5 text-slate-300 bg-slate-900/30";
                        if (isSelected) {
                          if (isCorrectAnswer) {
                            btnStyle = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold";
                          } else {
                            btnStyle = "border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold";
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            disabled={quizSuccess} // Disable once they answered correctly to prevent clicking other options
                            onClick={() => {
                              setSelectedAnswer(oIdx);
                              if (isCorrectAnswer) {
                                setQuizSuccess(true);
                                setQuizError(null);
                              } else {
                                setQuizSuccess(false);
                                setQuizError("Đáp án chưa chính xác. Hãy suy nghĩ lại nhé!");
                              }
                            }}
                            className={`w-full p-4 rounded-xl text-left border text-sm transition-all duration-200 flex items-center justify-between group ${btnStyle}`}
                          >
                            <span>{option}</span>
                            {isSelected && isCorrectAnswer && (
                              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                            )}
                            {isSelected && !isCorrectAnswer && (
                              <X className="w-4 h-4 text-rose-400 flex-shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Error / Success Feedback */}
                    {quizError && (
                      <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-400 text-center animate-fade-in font-mono">
                        {quizError}
                      </div>
                    )}
                    {quizSuccess && (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-emerald-400 text-center animate-fade-in font-mono">
                        ✓ Chính xác! Bạn đã sẵn sàng sang câu tiếp theo.
                      </div>
                    )}

                    {/* Quiz Action Button */}
                    <div className="pt-4 border-t border-slate-800 flex space-x-3">
                      <button
                        onClick={() => setQuizMode(false)}
                        className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 rounded-xl text-sm transition font-display"
                      >
                        Quay lại tài liệu
                      </button>
                      
                      {quizSuccess && (
                        <button
                          onClick={async () => {
                            if (currentQuestionIdx + 1 < (selectedLesson.quiz_questions?.length || 0)) {
                              setCurrentQuestionIdx(currentQuestionIdx + 1);
                              setSelectedAnswer(null);
                              setQuizSuccess(false);
                              setQuizError(null);
                            } else {
                              setQuizCompleted(true);
                              await handleCompleteLesson(selectedLesson.id);
                            }
                          }}
                          className="flex-1 py-2.5 bg-gradient-to-r from-vault-gold to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-955 font-bold rounded-xl text-sm transition duration-300 shadow-md shadow-vault-gold/15 flex items-center justify-center space-x-2"
                        >
                          <span>{currentQuestionIdx + 1 === (selectedLesson.quiz_questions?.length || 0) ? "Hoàn thành bài học" : "Câu tiếp theo"}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <p className="text-slate-300 leading-relaxed text-sm">{selectedLesson.description}</p>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2 text-slate-400 font-mono">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{selectedLesson.duration_minutes} phút</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-mono text-xs uppercase bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">{selectedLesson.difficulty}</span>
                    </div>
                  </div>
                  {selectedLesson.resources && selectedLesson.resources.length > 0 && (
                    <div className="pt-4 border-t border-slate-800">
                      <p className="font-semibold text-slate-200 mb-3 flex items-center space-x-2 font-display text-sm uppercase tracking-wider">
                        <ExternalLink className="w-4 h-4 text-amber-500" />
                        <span>Tài nguyên tham khảo</span>
                      </p>
                      <ul className="space-y-2">
                        {selectedLesson.resources.map((res, i) => {
                          const parts = res.split('|');
                          const label = parts[0]?.trim();
                          const url = parts[1]?.trim();

                          if (url) {
                            return (
                              <li key={i}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-2 text-amber-505 hover:text-amber-400 hover:underline text-sm transition-colors font-mono"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                  <span>{label}</span>
                                </a>
                              </li>
                            );
                          }

                          return (
                            <li key={i} className="flex items-center space-x-2 text-slate-400 text-sm font-sans">
                              <ChevronRight className="w-3 h-3 text-slate-600" />
                              <span>{label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="p-6 border-t border-slate-800 flex space-x-3 bg-slate-950/20">
                  <button
                    onClick={() => setSelectedLesson(null)}
                    className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 font-semibold py-2.5 rounded-xl transition text-sm font-display"
                  >
                    Đóng
                  </button>
                  
                  {progress && (
                    selectedLesson.quiz_questions && selectedLesson.quiz_questions.length > 0 ? (
                      progress.completed_lessons?.includes(selectedLesson.id) ? (
                        <div className="flex-1 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center font-bold rounded-xl text-sm flex items-center justify-center space-x-1 font-display">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>Đã vượt qua trắc nghiệm</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setQuizMode(true)}
                          className="flex-1 bg-gradient-to-r from-vault-gold to-amber-600 hover:brightness-110 text-slate-955 font-bold py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-vault-gold/15 flex items-center justify-center space-x-2 text-sm"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Bắt đầu Trắc nghiệm ({selectedLesson.quiz_questions.length} câu)</span>
                        </button>
                      )
                    ) : (
                      !progress.completed_lessons?.includes(selectedLesson.id) && (
                        <button
                          onClick={() => {
                            handleCompleteLesson(selectedLesson.id);
                            setSelectedLesson(null);
                          }}
                          className="flex-1 bg-gradient-to-r from-vault-gold to-amber-600 text-slate-955 font-bold py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-vault-gold/15 text-sm"
                        >
                          Đánh dấu hoàn thành
                        </button>
                      )
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RoadmapView

import React, { useState, useEffect } from 'react'
import { X, CheckCircle, Trophy, ChevronRight, AlertCircle, RefreshCw, Award } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function QuizModal({ lesson, onClose, onCompleteLesson, onBackToLesson }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [shuffledOptions, setShuffledOptions] = useState([])

  const questions = lesson?.quiz_questions || []
  const currentQ = questions[currentIdx]
  const correctAnswer = currentQ && currentQ.correct_answer !== undefined 
    ? currentQ.correct_answer 
    : (currentQ && currentQ.correct !== undefined ? currentQ.correct : 0)

  useEffect(() => {
    if (isFinished && score === questions.length) {
      // Trigger celebratory confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }
  }, [isFinished, score, questions.length])

  useEffect(() => {
    if (currentQ) {
      const mapped = currentQ.options.map((text, idx) => ({
        text,
        originalIndex: idx
      }))
      const shuffled = [...mapped].sort(() => Math.random() - 0.5)
      setShuffledOptions(shuffled)
    }
  }, [currentIdx, currentQ])

  if (!lesson || questions.length === 0) return null

  const handleSelectOption = (idx, originalIndex) => {
    if (isAnswered) return
    setSelectedOption(idx)
    setIsAnswered(true)

    if (originalIndex === correctAnswer) {
      setScore((prev) => prev + 1)
      setErrorMsg(null)
    } else {
      setErrorMsg('Đáp án chưa chính xác. Hãy suy ngẫm lý thuyết trong bài học nhé!')
    }
  }

  const handleNextQuestion = async () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1)
      setSelectedOption(null)
      setIsAnswered(false)
      setErrorMsg(null)
    } else {
      setIsFinished(true)
      if (score >= Math.ceil(questions.length * 0.7)) {
        await onCompleteLesson(lesson.id)
      }
    }
  }

  const handleRetry = () => {
    setCurrentIdx(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setScore(0)
    setIsFinished(false)
    setErrorMsg(null)
  }

  const passed = score >= Math.ceil(questions.length * 0.7)

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col border border-slate-800 animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Bài kiểm tra trắc nghiệm
              </span>
              <h3 className="text-base font-bold text-slate-100 font-display">
                {lesson.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-900 rounded-xl transition text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quiz Body */}
        <div className="p-8 space-y-6 bg-slate-950/50">
          {isFinished ? (
            <div className="text-center py-8 space-y-6 animate-fade-in">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border ${
                passed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {passed ? <Trophy className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-100 font-display mb-2">
                  {passed ? 'Chúc mừng bạn đã hoàn thành!' : 'Chưa đạt yêu cầu'}
                </h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  {passed
                    ? `Bạn đã đạt ${score}/${questions.length} điểm chính xác. Bài học đã được tự động ghi nhận vào lộ trình học tập của bạn!`
                    : `Bạn đạt ${score}/${questions.length} điểm. Hãy xem lại nội dung bài học và thử sức lần nữa nhé.`}
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold rounded-xl text-sm transition border border-slate-800"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Làm lại bài kiểm tra</span>
                </button>
                {passed ? (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-gradient-to-r from-vault-gold to-amber-600 hover:brightness-110 text-slate-950 font-bold rounded-xl text-sm transition shadow-md shadow-vault-gold/20"
                  >
                    Quay lại lộ trình
                  </button>
                ) : (
                  <button
                    onClick={onBackToLesson}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-md shadow-amber-500/20"
                  >
                    Xem lại lý thuyết
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress bar and counter */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase tracking-wider font-semibold">
                  Câu hỏi {currentIdx + 1} / {questions.length}
                </span>
                <span className="text-amber-400 font-bold">
                  Điểm hiện tại: {score}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <h4 className="text-lg font-bold text-slate-100 font-display leading-relaxed pt-2">
                {currentQ.question}
              </h4>

              {/* Options */}
              <div className="space-y-3">
                {shuffledOptions.map((opt, idx) => {
                  const isChosen = selectedOption === idx
                  const isCorrect = opt.originalIndex === correctAnswer

                  let btnClasses =
                    'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900 hover:border-slate-700'

                  if (isAnswered) {
                    if (isCorrect) {
                      btnClasses =
                        'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-bold shadow-sm shadow-emerald-500/10'
                    } else if (isChosen && !isCorrect) {
                      btnClasses =
                        'border-rose-500/50 bg-rose-500/10 text-rose-400 font-bold'
                    } else {
                      btnClasses = 'border-slate-800/50 bg-slate-900/20 text-slate-500 opacity-60'
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(idx, opt.originalIndex)}
                      className={`w-full p-4 rounded-xl text-left border text-sm transition-all flex items-center justify-between gap-3 ${btnClasses}`}
                    >
                      <span className="flex-1 leading-snug">{opt.text}</span>
                      {isAnswered && isCorrect && (
                        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      )}
                      {isAnswered && isChosen && !isCorrect && (
                        <X className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Feedback Alert */}
              {isAnswered && (
                <div className="pt-2 animate-fade-in">
                  {errorMsg ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-mono flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Chính xác tuyệt đối! Lý thuyết đã được nắm vững.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isFinished && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-4">
            <button
              onClick={onBackToLesson}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-xl text-sm transition font-semibold"
            >
              Quay lại lý thuyết
            </button>

            {isAnswered && (
              <button
                onClick={handleNextQuestion}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-vault-gold to-amber-600 hover:brightness-110 text-slate-950 font-bold rounded-xl text-sm transition shadow-md shadow-vault-gold/20 animate-fade-in"
              >
                <span>{currentIdx + 1 === questions.length ? 'Hoàn tất kiểm tra' : 'Câu tiếp theo'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

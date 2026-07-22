import React from 'react'
import { Sparkles, ArrowRight, Lock, ShieldAlert } from 'lucide-react'

export default function GuestBanner({ onRegister, onLogin }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-amber-600/10 border border-amber-500/30 p-4 sm:p-5 shadow-lg shadow-amber-500/5 mb-6">
      {/* Background Subtle Mesh */}
      <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 shadow-sm shadow-amber-500/10">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Chế độ Khách (Guest)
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-100 font-display mt-1">
              Khám phá Nền tảng Học tập Blockchain & AI Security Mentor
            </h4>
            <p className="text-xs text-slate-300 font-sans mt-0.5 leading-relaxed max-w-xl">
              Bạn đang xem thử nội dung bài học. Hãy tạo tài khoản miễn phí để lưu tiến độ vĩnh viễn, mở khóa <strong>AI Tutor Chat</strong>, thực hành <strong>Lab Workspace</strong> và nhận <strong>Giấy Chứng Nhận</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-shrink-0">
          {onLogin && (
            <button
              onClick={onLogin}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-mono font-bold text-slate-300 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition"
            >
              Đăng nhập
            </button>
          )}
          {onRegister && (
            <button
              onClick={onRegister}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-mono font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 rounded-xl transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>Đăng ký ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

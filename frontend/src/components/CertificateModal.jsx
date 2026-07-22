import React, { useRef } from 'react'
import { ShieldCheck, Download, Share2, X, Sparkles, Trophy, Award, CheckCircle2 } from 'lucide-react'

export default function CertificateModal({ user, onClose }) {
  const certRef = useRef(null)
  const todayDate = new Date().toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const handleDownload = () => {
    // Simple window print or image export simulation
    const content = certRef.current
    if (!content) return
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Blockchain Security Certificate - ${user?.username || 'Student'}</title>
          <style>
            body { background: #06080d; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; justify-center; align-items: center; min-height: 100vh; margin: 0; }
            .cert-box { border: 4px solid #f59e0b; padding: 40px; border-radius: 24px; background: #0b0e14; text-align: center; max-width: 700px; box-shadow: 0 0 50px rgba(245, 158, 11, 0.2); }
            h1 { color: #f59e0b; font-size: 28px; margin-bottom: 10px; letter-spacing: 2px; }
            .subtitle { color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 3px; }
            .name { font-size: 32px; color: #ffffff; margin: 25px 0; border-bottom: 2px solid #f59e0b; display: inline-block; padding-bottom: 8px; }
            .desc { color: #cbd5e1; line-height: 1.6; font-size: 15px; }
            .badge { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 6px 16px; border-radius: 8px; display: inline-block; font-size: 12px; margin-top: 20px; font-weight: bold; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <div class="subtitle">BLOCKCHAIN ACADEMY & AI MENTOR</div>
            <h1>GIẤY CHỨNG NHẬN HOÀN THÀNH KHÓA HỌC</h1>
            <p class="desc">Trân trọng chứng nhận học viên</p>
            <div class="name">${user?.username || user?.email || 'Học Viên Blockchain'}</div>
            <p class="desc">Đã hoàn thành xuất sắc 100% Lộ trình đào tạo<br/><strong>Blockchain Security Fundamentals & Smart Contract Audit</strong></p>
            <div class="badge">🛡️ CERTIFIED SMART CONTRACT AUDITOR</div>
            <div class="footer">
              <div>Ngày cấp: ${todayDate}</div>
              <div>Xác thực bởi: AI Security Mentor Platform</div>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0e131f] via-[#090d16] to-[#06080d] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 text-slate-100 overflow-hidden">
        
        {/* Glow Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 bg-slate-900/80 rounded-xl border border-slate-800 transition z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Card Content */}
        <div ref={certRef} className="relative z-10 border border-amber-500/20 rounded-2xl p-6 sm:p-8 bg-slate-950/60 backdrop-blur-sm text-center">
          
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10 animate-pulse">
              <Award className="w-9 h-9 text-amber-400" />
            </div>
          </div>

          <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase font-bold block mb-1">
            BLOCKCHAIN ACADEMY & AI MENTOR
          </span>

          <h2 className="text-xl sm:text-2xl font-black font-display text-slate-100 tracking-wide uppercase">
            Giấy Chứng Nhận Hoàn Thành
          </h2>

          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto my-3" />

          <p className="text-xs text-slate-400 font-sans">
            Chứng nhận thành tích học tập trao cho
          </p>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-display my-3 tracking-wider underline decoration-amber-500/40 underline-offset-8">
            {user?.username || user?.email || 'Học Viên Blockchain'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-lg mx-auto">
            Đã vượt qua tất cả các bài kiểm toán lý thuyết và lab thực hành của khóa học:
          </p>
          <p className="text-sm font-bold text-emerald-400 font-mono my-2">
            "Blockchain Security Fundamentals & Smart Contract Audit"
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap justify-center gap-2 my-4 font-mono text-[10px]">
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> CERTIFIED AUDITOR
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% COMPLETED
            </span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-900 text-[11px] font-mono text-slate-500">
            <div>Ngày cấp: <strong className="text-slate-300">{todayDate}</strong></div>
            <div>Mã xác thực: <strong className="text-amber-500 font-mono">BCA-{Math.floor(100000 + Math.random() * 900000)}</strong></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 relative z-10">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Tải về / In Chứng Nhận (PDF)
          </button>
          <button
            onClick={() => alert('Đã sao chép liên kết chứng nhận để chia sẻ!')}
            className="py-3 px-4 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 font-bold font-mono text-xs rounded-xl transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            Chia sẻ
          </button>
        </div>

      </div>
    </div>
  )
}

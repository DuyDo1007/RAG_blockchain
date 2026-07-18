import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Lock, Mail, User, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function RegisterPage({ onToggleLogin }) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !username || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ tất cả các trường thông tin.')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    try {
      setLoading(true)
      setError('')
      await register(email, username, password)
    } catch (err) {
      setError(err.response?.data?.detail || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-deep bg-mesh flex items-center justify-center p-4 relative overflow-hidden text-slate-100 font-sans">
      {/* Background glow animations */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }}></div>

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-md glass-strong border border-slate-800 rounded-2xl p-8 shadow-md shadow-vault-gold/10 backdrop-blur-xl animate-fade-in relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-center mb-3 shadow-md shadow-vault-gold/10 shield-pulse">
            <Shield className="w-9 h-9 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-wide text-center font-display">
            Tạo Tài Khoản Mới
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 text-center font-sans">
            Tham gia cộng đồng Đánh giá & Audit Smart Contract AI
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm animate-slide-up">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display">
              Tên người dùng (Username)
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="security_pro_99"
                className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 8 ký tự"
                className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2.5 pl-11 pr-11 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-display">
              Xác nhận Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-amber-600 font-bold text-sm text-slate-955 shadow-md shadow-vault-gold/15 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-955/30 border-t-slate-955 rounded-full animate-spin"></span>
                Đang tạo tài khoản...
              </span>
            ) : (
              <>
                <span>Đăng ký Tài khoản</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400 font-sans">
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={onToggleLogin}
            className="text-amber-500 hover:text-amber-400 font-semibold transition-colors underline underline-offset-4 font-display"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  )
}

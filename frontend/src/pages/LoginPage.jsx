import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Shield, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage({ onToggleRegister }) {
  const { login, loginWithGoogle, continueAsGuest } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Initialize Google Identity Services
  useEffect(() => {
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!client_id || client_id === 'your-google-client-id.apps.googleusercontent.com') return

    const loadGoogleScript = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id,
          callback: handleGoogleResponse
        })
        window.google.accounts.id.renderButton(
          document.getElementById('googleSignInBtn'),
          { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' }
        )
      } else {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
          window.google.accounts.id.initialize({
            client_id,
            callback: handleGoogleResponse
          })
          window.google.accounts.id.renderButton(
            document.getElementById('googleSignInBtn'),
            { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' }
          )
        }
        document.body.appendChild(script)
      }
    }
    loadGoogleScript()
  }, [])

  const handleGoogleResponse = async (response) => {
    try {
      setLoading(true)
      setError('')
      await loginWithGoogle(response.credential)
    } catch (err) {
      setError(err.response?.data?.detail || 'Đăng nhập Google thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.')
      return
    }
    try {
      setLoading(true)
      setError('')
      await login(email, password)
    } catch (err) {
      setError(err.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06080d] bg-mesh flex items-center justify-center p-4 relative overflow-hidden text-slate-100 font-sans">
      {/* Background glow animations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-md glass-panel glass-panel-glow rounded-3xl p-8 animate-fade-in relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center mb-4 shadow-md shadow-amber-500/10 shield-pulse">
            <Shield className="w-9 h-9 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold gradient-text tracking-wide text-center font-display">
            GenAI Blockchain Security
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 text-center font-sans">
            Hệ thống AI Đánh Giá Bảo Mật & Audit Smart Contract
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-3 text-rose-300 text-sm animate-slide-up">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-450" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2 font-display">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-700 transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-450 uppercase tracking-wider mb-2 font-display">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-850 hover:border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 rounded-xl py-3 pl-11 pr-11 text-sm text-slate-100 placeholder-slate-700 transition-all font-mono"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-vault-gold to-amber-600 font-bold text-sm text-slate-950 shadow-md shadow-vault-gold/15 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                Đang xử lý...
              </span>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px bg-slate-850 flex-1"></div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Hoặc tiếp tục với</span>
          <div className="h-px bg-slate-850 flex-1"></div>
        </div>

        {/* Google Sign In Container */}
        <div id="googleSignInBtn" className="w-full flex justify-center min-h-[40px]"></div>

        <div className="mt-6 text-center text-sm text-slate-400 flex flex-col gap-2.5 font-sans">
          <div>
            Chưa có tài khoản?{' '}
            <button
              type="button"
              onClick={onToggleRegister}
              className="text-amber-500 hover:text-amber-400 font-semibold transition-colors underline underline-offset-4 font-display"
            >
              Đăng ký ngay
            </button>
          </div>
          <div className="mt-1">
            <button
              type="button"
              onClick={continueAsGuest}
              className="text-cyan-400 hover:text-cyan-300 font-mono text-xs transition-colors hover:underline"
            >
              ➔ Duyệt với tư cách Khách (Guest Mode)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

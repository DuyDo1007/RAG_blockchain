import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth, API_BASE_URL } from './contexts/AuthContext'
import Sidebar from './components/Sidebar'
import ChatHistory from './components/ChatHistory'
import ChatWindow from './components/ChatWindow'
import RoadmapView from './components/Roadmap'
import ContractAudit from './components/ContractAudit'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import './index.css'
import axios from 'axios'
import { Shield, MessageSquare, Sparkles, Loader2 } from 'lucide-react'

function TelemetryHeader() {
  const [blockHeight, setBlockHeight] = useState(19876241)
  const [mockHash, setMockHash] = useState('0x6f91b...4e2d')
  const [latency, setLatency] = useState(18)

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight(prev => prev + Math.floor(Math.random() * 2))
      setLatency(15 + Math.floor(Math.random() * 8))
      
      const hex = '0123456789abcdef'
      let newHash = '0x'
      for (let i = 0; i < 6; i++) {
        newHash += hex[Math.floor(Math.random() * 16)]
      }
      newHash += '...'
      for (let i = 0; i < 4; i++) {
        newHash += hex[Math.floor(Math.random() * 16)]
      }
      setMockHash(newHash)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-10 border-b border-slate-800 bg-slate-950/80 px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none z-30 relative border-t-2 border-t-amber-500/40">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-slate-300">SECURE VAULT ACTIVE</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-slate-600">BLOCK:</span>
          <span className="text-amber-500 font-semibold">{blockHeight}</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <span className="text-slate-600">HASH:</span>
          <span className="text-cyan-400 font-bold">{mockHash}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">INDEX STORE:</span>
          <span className="text-emerald-500 font-bold">QDRANT RAG</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600">LATENCY:</span>
          <span className="text-slate-300 font-semibold">{latency}ms</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-slate-600">AGENT MODEL:</span>
          <span className="text-amber-500 font-semibold">GEMINI 2.5 FLASH</span>
        </div>
      </div>
    </div>
  )
}

function MainContent() {
  const { user, isAuthenticated, loading, logout } = useAuth()
  const [authMode, setAuthMode] = useState('login') // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'audit' | 'roadmap'
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [refreshHistory, setRefreshHistory] = useState(0)

  const triggerRefreshHistory = () => {
    setRefreshHistory(prev => prev + 1)
  }

  const handleNewSession = async () => {
    if (!user) return
    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions?title=Cuộc trò chuyện mới`
      )
      setCurrentSessionId(response.data.session_id || response.data.id)
      triggerRefreshHistory()
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-deep bg-mesh flex flex-col items-center justify-center text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-slate-900/60 border border-amber-500/40 flex items-center justify-center mb-4 shadow-md shadow-vault-gold/20 shield-pulse">
          <Shield className="w-9 h-9 text-amber-500" />
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-slate-300 font-mono tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          <span>VAULT SECURITY CORE INITIALIZING...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <RegisterPage onToggleLogin={() => setAuthMode('login')} />
    }
    return <LoginPage onToggleRegister={() => setAuthMode('register')} />
  }

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-cyber-deep text-slate-100 font-sans">
      <div className="bg-mesh" />

      {/* Telemetry Header */}
      <TelemetryHeader />

      <div className="relative z-10 flex flex-1 w-full h-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
          onLogout={logout}
        />

        {/* Main Content Areas */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'chat' && (
            <>
              {/* Chat History Pane */}
              <div className="w-72 border-r border-slate-800 overflow-hidden bg-slate-950/40 backdrop-blur-md">
                <ChatHistory
                  userId={user.id || user._id}
                  currentSessionId={currentSessionId}
                  onSelectSession={setCurrentSessionId}
                  onNewSession={handleNewSession}
                  refreshTrigger={refreshHistory}
                />
              </div>

              {/* Chat Window Pane */}
              <div className="flex-1 overflow-hidden">
                {currentSessionId ? (
                  <ChatWindow
                    sessionId={currentSessionId}
                    userId={user.id || user._id}
                    onSessionUpdated={triggerRefreshHistory}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-cyber-surface">
                    <div className="text-center animate-fade-in max-w-sm">
                      <div className="w-20 h-20 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center mx-auto mb-6 shadow-md shadow-vault-gold/10">
                        <MessageSquare className="w-10 h-10 text-vault-gold" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-200 mb-1.5 font-display">Bắt đầu Cuộc Trò Chuyện</h3>
                      <p className="text-sm text-slate-400 mb-6">Chọn từ danh sách bên trái hoặc tạo một cuộc trò chuyện AI mới để bắt đầu hỏi đáp.</p>
                      <button
                        onClick={handleNewSession}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-vault-gold via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 px-6 py-3 rounded-xl transition-all font-bold text-sm active:scale-95 shadow-md shadow-vault-gold/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Tạo cuộc trò chuyện mới</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'audit' && (
            <ContractAudit />
          )}

          {activeTab === 'roadmap' && (
            <div className="flex-1 overflow-auto bg-cyber-surface">
              <RoadmapView userId={user.id || user._id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}

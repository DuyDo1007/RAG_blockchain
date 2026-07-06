import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatHistory from './components/ChatHistory'
import ChatWindow from './components/ChatWindow'
import RoadmapView from './components/Roadmap'
import './index.css'
import axios from 'axios'
import { Shield, MessageSquare, Sparkles } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('chat')
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [refreshHistory, setRefreshHistory] = useState(0)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  const triggerRefreshHistory = () => {
    setRefreshHistory(prev => prev + 1)
  }

  // Initialize user (demo: use localStorage)
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      setUserId(storedUserId)
      setIsLoggedIn(true)
    } else {
      // Auto-generate demo user ID
      const newUserId = `user_${Date.now()}`
      localStorage.setItem('userId', newUserId)
      setUserId(newUserId)
      setIsLoggedIn(true)
    }
  }, [])

  const handleNewSession = async () => {
    if (!userId) return
    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/sessions?user_id=${userId}&title=Cuộc trò chuyện mới`
      )
      setCurrentSessionId(response.data.session_id)
      triggerRefreshHistory()
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userId')
    setUserId(null)
    setIsLoggedIn(false)
    setCurrentSessionId(null)
  }

  if (!isLoggedIn || !userId) {
    return (
      <div className="relative flex items-center justify-center h-screen overflow-hidden">
        <div className="bg-mesh" />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-400/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `particle-float ${8 + Math.random() * 12}s linear infinite`,
                animationDelay: `${Math.random() * 8}s`,
              }}
            />
          ))}
        </div>
        <div className="text-center relative z-10 animate-fade-in">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shield-pulse">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold gradient-text mb-3">GenAI Blockchain Security</h1>
          <p className="text-slate-400 text-lg mb-8">Chatbot Hỏi Đáp & Lộ trình Học</p>
          <div className="flex justify-center space-x-2">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="bg-mesh" />

      <div className="relative z-10 flex w-full h-full">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userEmail={`user_${userId.slice(-8)}`}
          onLogout={handleLogout}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'chat' ? (
            <>
              {/* Chat History */}
              <div className="w-72 border-r border-white/5 overflow-hidden">
                <ChatHistory
                  userId={userId}
                  currentSessionId={currentSessionId}
                  onSelectSession={setCurrentSessionId}
                  onNewSession={handleNewSession}
                  refreshTrigger={refreshHistory}
                />
              </div>

              {/* Chat Window */}
              <div className="flex-1 overflow-hidden">
                {currentSessionId ? (
                  <ChatWindow 
                    sessionId={currentSessionId} 
                    userId={userId} 
                    onSessionUpdated={triggerRefreshHistory}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-cyber-surface">
                    <div className="text-center animate-fade-in">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-600/10 border border-white/5 flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-10 h-10 text-slate-600" />
                      </div>
                      <p className="text-lg font-semibold text-slate-400 mb-1">Chọn hoặc tạo cuộc trò chuyện</p>
                      <p className="text-sm text-slate-500 mb-6">Bắt đầu hỏi đáp về bảo mật blockchain</p>
                      <button
                        onClick={handleNewSession}
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl transition-all duration-300 shadow-neon-cyan hover:shadow-lg font-medium"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Tạo cuộc trò chuyện mới</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'roadmap' ? (
            <div className="flex-1 overflow-auto bg-cyber-surface">
              <RoadmapView userId={userId} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default App

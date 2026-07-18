import React, { useState, useEffect } from 'react'
import { Trash2, Plus, MessageCircle, Search } from 'lucide-react'
import axios from 'axios'

const ChatHistory = ({ userId, currentSessionId, onSelectSession, onNewSession, refreshTrigger }) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasConnectionError, setHasConnectionError] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  useEffect(() => {
    loadSessions()
  }, [userId, refreshTrigger])

  const loadSessions = async () => {
    setLoading(true)
    setHasConnectionError(false)
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_BASE_URL}/chat/sessions/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const list = response.data || []
      const normalized = list.map(item => ({
        ...item,
        session_id: item.session_id || item.id || item._id
      }))
      setSessions(normalized)
    } catch (error) {
      console.error('Error loading sessions:', error)
      setHasConnectionError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation()
    if (confirm('Bạn chắc chắn muốn xóa cuộc trò chuyện này?')) {
      try {
        const token = localStorage.getItem('access_token')
        await axios.delete(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        setSessions(sessions.filter(s => s.session_id !== sessionId))
      } catch (error) {
        console.error('Error deleting session:', error)
      }
    }
  }

  const filteredSessions = sessions.filter(s =>
    !searchQuery || s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full bg-cyber-surface/50 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl transition-all duration-300 font-medium text-sm shadow-neon-cyan hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Cuộc trò chuyện mới</span>
        </button>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500">
            <div className="flex justify-center space-x-1.5 mb-2">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : hasConnectionError ? (
          <div className="p-6 text-center">
            <p className="text-xs text-rose-400 font-semibold mb-1">Mất kết nối máy chủ</p>
            <p className="text-slate-500 text-xs mb-3">Vui lòng kiểm tra backend và thử lại</p>
            <button
              onClick={loadSessions}
              className="text-xs px-3 py-1 bg-white/5 border border-white/10 hover:bg-white/10 text-cyan-400 rounded-lg transition"
            >
              Thử lại
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có cuộc trò chuyện'}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredSessions.map((session) => (
              <div
                key={session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 group relative ${
                  currentSessionId === session.session_id
                    ? 'bg-cyan-500/10 border border-cyan-500/20'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${
                      currentSessionId === session.session_id ? 'text-cyan-300' : 'text-slate-300'
                    }`}>
                      {session.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {session.message_count} tin nhắn
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(session.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.session_id, e)}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 hover:bg-rose-500/15 hover:text-rose-400 text-slate-500 rounded-lg transition-all duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatHistory

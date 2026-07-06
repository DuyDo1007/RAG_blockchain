import React, { useState, useEffect, useRef } from 'react'
import { Send, Shield, Sparkles, Code2, AlertTriangle, BookOpen } from 'lucide-react'
import axios from 'axios'
import './ChatWindow.css'

const suggestions = [
  { icon: AlertTriangle, text: 'Reentrancy attack là gì?', color: 'text-amber-400' },
  { icon: Code2, text: 'Phân tích lỗ hổng smart contract', color: 'text-cyan-400' },
  { icon: BookOpen, text: 'Best practices bảo mật Solidity', color: 'text-emerald-400' },
]

const ChatWindow = ({ sessionId, userId, onSessionUpdated }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      loadMessages()
    }
  }, [sessionId])

  const loadMessages = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages`
      )
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message to UI
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      sources: []
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Send message to backend
      const response = await axios.post(
        `${API_BASE_URL}/chat/send`,
        {
          user_id: userId,
          session_id: sessionId,
          message: input,
          model: 'gemini-pro'
        }
      )

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: response.data.content,
        timestamp: response.data.timestamp,
        sources: response.data.sources || []
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Update sidebar if title changed
      if (response.data.title && onSessionUpdated) {
        onSessionUpdated()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      let errorMsg = 'Xin lỗi, không thể kết nối tới máy chủ (Network Error). Vui lòng kiểm tra xem backend đã được khởi động chưa.'
      if (error.response) {
        const detail = error.response.data?.detail || ''
        if (error.response.status === 429 || String(detail).toLowerCase().includes('quota') || String(detail).toLowerCase().includes('limit')) {
          errorMsg = '⚠️ Hệ thống AI hiện đang hết hạn ngạch (Out of Quota). Vui lòng thử lại sau hoặc cập nhật GEMINI_API_KEY hợp lệ trong file .env.'
        } else if (detail) {
          errorMsg = `Đã xảy ra lỗi từ máy chủ: ${detail}`
        }
      }
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date().toISOString(),
          sources: []
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (text) => {
    setInput(text)
    inputRef.current?.focus()
  }

  return (
    <div className="chat-window flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6 shield-pulse">
                <Shield className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold gradient-text mb-2">
                Blockchain Security Assistant
              </h2>
              <p className="text-slate-400 text-sm mb-8">
                Hỏi bất kỳ câu hỏi nào về bảo mật blockchain, smart contract vulnerabilities, hoặc best practices.
              </p>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all duration-200 text-left group"
                  >
                    <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
                    <span className="text-sm text-slate-300 group-hover:text-slate-200">{s.text}</span>
                    <Sparkles className="w-3 h-3 text-slate-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} msg-enter`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
              )}
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                    : 'bg-white/[0.05] border border-white/[0.08] text-slate-200'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/10">
                    <p className="text-xs font-semibold mb-1.5 text-slate-400">📚 Nguồn tham khảo:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((source, i) => (
                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-xs font-medium border border-cyan-500/20">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/50' : 'text-slate-500'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('vi-VN')}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start msg-enter">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center mr-3 flex-shrink-0">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="bg-white/[0.05] border border-white/[0.08] px-5 py-4 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi về bảo mật blockchain..."
            disabled={loading}
            className="flex-1 px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-white/[0.07] transition-all duration-200"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white px-5 py-3 rounded-xl flex items-center justify-center transition-all duration-200 hover:shadow-neon-cyan active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatWindow

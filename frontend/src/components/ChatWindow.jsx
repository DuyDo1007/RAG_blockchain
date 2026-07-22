import React, { useState, useEffect, useRef } from 'react'
import { Send, Shield, Sparkles, Code2, AlertTriangle, BookOpen, Copy, Check, Lock } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useAuth } from '../contexts/AuthContext'
import './ChatWindow.css'

const suggestions = [
  { icon: AlertTriangle, text: 'Reentrancy attack là gì và làm sao để phòng chống?', color: 'text-amber-400' },
  { icon: Code2, text: 'Giải thích cơ chế Gas, EVM và cấu trúc Account trong Ethereum', color: 'text-cyan-400' },
  { icon: BookOpen, text: 'Sự khác biệt cốt lõi giữa đồng thuận Proof of Work vs Proof of Stake?', color: 'text-emerald-400' },
]

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const ChatWindow = ({ sessionId, userId, onSessionUpdated }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (sessionId) {
      loadMessages()
    }
  }, [sessionId])

  const loadMessages = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      sources: []
    }

    setMessages(prev => [...prev, userMsg])
    const currentQuery = input
    setInput('')
    setLoading(true)

    // Add temporary assistant placeholder
    const assistantIndex = messages.length + 1
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        sources: [],
        agentSteps: [],
        isStreaming: true
      }
    ])

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: currentQuery,
          model: 'gemini-3.5-flash'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let streamBuffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        streamBuffer += decoder.decode(value, { stream: true })
        const lines = streamBuffer.split('\n\n')
        streamBuffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (!dataStr) continue
            try {
              const event = JSON.parse(dataStr)
              if (event.type === 'sources') {
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      sources: event.content || []
                    }
                  }
                  return updated
                })
              } else if (event.type === 'status') {
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]) {
                    const currentSteps = updated[assistantIndex].agentSteps || []
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      agentSteps: [...currentSteps, event]
                    }
                  }
                  return updated
                })
              } else if (event.type === 'chunk') {
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      content: updated[assistantIndex].content + event.content
                    }
                  }
                  return updated
                })
              } else if (event.type === 'title') {
                if (onSessionUpdated) onSessionUpdated()
              } else if (event.type === 'done') {
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      isStreaming: false
                    }
                  }
                  return updated
                })
              } else if (event.type === 'error') {
                setMessages(prev => {
                  const updated = [...prev]
                  if (updated[assistantIndex]) {
                    updated[assistantIndex] = {
                      ...updated[assistantIndex],
                      content: updated[assistantIndex].content + `\n\n⚠️ ${event.content}`,
                      isStreaming: false
                    }
                  }
                  return updated
                })
              }
            } catch (err) {
              console.error('Error parsing SSE json:', err)
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error)
      setMessages(prev => {
        const updated = [...prev]
        if (updated[assistantIndex]) {
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content: '⚠️ Lỗi kết nối hoặc hết hạn ngạch API. Vui lòng kiểm tra lại server hoặc thử lại sau.',
            isStreaming: false
          }
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleSuggestionClick = (text) => {
    setInput(text)
    inputRef.current?.focus()
  }

  const [showThoughtProcess, setShowThoughtProcess] = useState(false)

  const handleExportChat = () => {
    if (messages.length === 0) return
    let mdContent = `# Lịch Sử Trò Chuyện - AI Security Mentor\nNgày xuất: ${new Date().toLocaleString('vi-VN')}\n\n---\n\n`
    messages.forEach((msg, idx) => {
      const sender = msg.role === 'user' ? '👤 Học viên' : '🤖 AI Tutor'
      const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN')
      mdContent += `### ${sender} (${time})\n\n${msg.content}\n\n`
      if (msg.sources && msg.sources.length > 0) {
        mdContent += `*Nguồn tham khảo: ${msg.sources.join(', ')}*\n\n`
      }
      mdContent += `---\n\n`
    })

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `AI_Chat_Export_${sessionId || 'session'}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="chat-window flex flex-col h-full bg-[#06080d] text-slate-100 font-sans">
      {/* Header with Export Chat and Toggle Steps */}
      <div className="h-12 border-b border-slate-900 bg-slate-950/80 px-4 flex items-center justify-between text-xs flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300 font-mono">AI TUTOR CHAT</span>
          {messages.length > 0 && (
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {messages.length} tin nhắn
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowThoughtProcess(prev => !prev)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition ${
              showThoughtProcess 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showThoughtProcess ? 'Ẩn tiến trình RAG' : 'Xem tiến trình RAG'}
          </button>
          {messages.length > 0 && (
            <button
              onClick={handleExportChat}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-lg transition text-[11px] font-mono font-bold flex items-center gap-1.5"
              title="Xuất cuộc trò chuyện ra file Markdown"
            >
              <span>Xuất Chat (.md)</span>
            </button>
          )}
        </div>
      </div>
      {!user || user.isGuest ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm animate-fade-in space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
              <Lock className="w-8 h-8 text-amber-550 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-205 font-display">Phòng Chat Đang Khóa</h3>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Bạn đang duyệt với tư cách <strong>Khách</strong>. Vui lòng đăng ký hoặc đăng nhập tài khoản học viên để mở khóa tính năng trò chuyện và audit smart contract cùng AI Tutor.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                window.location.reload()
              }}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-vault-gold via-amber-500 to-amber-600 hover:brightness-110 text-slate-950 px-6 py-3 rounded-xl transition-all font-bold text-sm active:scale-95 shadow-md shadow-vault-gold/15"
            >
              <span>Đăng nhập / Đăng ký Ngay</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-slate-950/80 border border-amber-500/25 flex items-center justify-center mx-auto mb-6 shadow-md shadow-amber-500/10 shield-pulse">
                    <Shield className="w-8 h-8 text-amber-550" />
                  </div>
                  <h2 className="text-2xl font-bold gradient-text mb-2 tracking-wide font-display">
                    Blockchain Security Assistant
                  </h2>
                  <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    Trợ lý AI chuyên sâu về bảo mật Web3, audit smart contract Solidity/Vyper và giải đáp mọi lỗ hổng an toàn thông tin.
                  </p>
                  <div className="space-y-2.5">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s.text)}
                        className="w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl suggestion-item hover:shadow-sm text-left group"
                      >
                        <s.icon className={`w-4 h-4 ${s.color} flex-shrink-0`} />
                        <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{s.text}</span>
                        <Sparkles className="w-3.5 h-3.5 text-slate-650 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} msg-enter group`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-955/80 border border-slate-850 flex items-center justify-center mr-3 mt-1 flex-shrink-0 shadow-sm">
                      <Shield className="w-4 h-4 text-amber-500" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl p-5 relative ${
                      msg.role === 'user' ? 'bubble-user' : 'bubble-bot'
                    }`}
                  >
                    {/* Copy Button on hover */}
                    {msg.content && (
                      <button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-opacity ${
                          msg.role === 'user'
                            ? 'text-slate-950/70 hover:text-slate-955 bg-black/10 opacity-0 group-hover:opacity-100'
                            : 'text-slate-400 hover:text-amber-550 bg-slate-800/80 opacity-0 group-hover:opacity-100'
                        }`}
                        title="Sao chép tin nhắn"
                      >
                        {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}


                    {/* Agentic RAG Status Chain */}
                    {msg.role === 'assistant' && msg.agentSteps && msg.agentSteps.length > 0 && (showThoughtProcess || msg.isStreaming) && (
                      <div className="rag-node-trail mb-4 animate-fade-in">
                        <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1 font-bold mr-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>RAG AGENT:</span>
                        </span>
                        {msg.agentSteps.map((step, sIdx) => {
                          const isLast = sIdx === msg.agentSteps.length - 1 && msg.isStreaming
                          const nodeNames = {
                            router: '🧭 Router Phân loại',
                            retriever: '🔍 Tìm kiếm Qdrant',
                            grader: '🛡️ Kiểm chứng Grounding',
                            generator: '💡 Kiến tạo lời giải',
                            reject: '⚡ Trả lời trực tiếp',
                            direct: '⚡ Trả lời trực tiếp'
                          }
                          const label = nodeNames[step.node] || step.node
                          return (
                            <React.Fragment key={sIdx}>
                              <div className={`rag-node ${isLast ? 'active' : 'completed'}`} title={step.message}>
                                <span>{label}</span>
                              </div>
                              {sIdx < msg.agentSteps.length - 1 && (
                                <span className="rag-arrow font-mono text-xs">→</span>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    )}

                    {/* Markdown Content */}
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                        {msg.content ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline && match ? (
                                  <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                                    <div className="bg-slate-900 px-3.5 py-1.5 border-b border-slate-850 flex justify-between items-center text-xs text-slate-400 font-mono">
                                      <span className="text-amber-500">{match[1]}</span>
                                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suggested Secure Patch</span>
                                    </div>
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{ margin: 0, padding: '1rem', fontSize: '0.85rem', background: '#090b10' }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  </div>
                                ) : (
                                  <code className="bg-slate-900 text-amber-500 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-800" {...props}>
                                    {children}
                                  </code>
                                )
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <div className="flex items-center space-x-2 py-1">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">{msg.content}</p>
                    )}

                    {/* Reference Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <p className="text-xs font-semibold mb-2 text-slate-450 flex items-center gap-1.5 font-display">
                          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                          <span>Nguồn tài liệu RAG tham khảo:</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((source, i) => (
                            <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-900 text-amber-500 text-xs font-mono font-medium border border-slate-800">
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className={`text-[10px] font-mono mt-2.5 ${msg.role === 'user' ? 'text-slate-900/60' : 'text-slate-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-900 bg-[#0b0e14]/90 backdrop-blur-md">
            <form onSubmit={handleSendMessage} className="flex space-x-3 max-w-5xl mx-auto">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi về bảo mật, audit contract hoặc yêu cầu viết code sửa lỗi..."
                disabled={loading}
                className="flex-1 px-4 py-3.5 bg-slate-950/80 border border-slate-855 hover:border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 rounded-2xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all font-sans"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-vault-gold to-amber-600 text-slate-955 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-md shadow-vault-gold/15 active:scale-95"
              >
                <span>Gửi</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

export default ChatWindow

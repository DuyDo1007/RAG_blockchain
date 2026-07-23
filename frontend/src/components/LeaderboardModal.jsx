import React, { useState, useEffect } from 'react'
import { Trophy, Award, Flame, Zap, X, Loader2, Sparkles, BookOpen, ShieldCheck } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function LeaderboardModal({ onClose, currentUser }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${API_BASE_URL}/leaderboard?limit=50`, { headers })
      setLeaderboard(res.data || [])
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError('Không thể tải bảng xếp hạng. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const topThree = leaderboard.slice(0, 3)
  const others = leaderboard.slice(3)

  const getPodiumStyle = (rank) => {
    if (rank === 1) return { border: 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20', badge: '🥇 #1 GOLD', text: 'text-amber-400', height: 'order-1 sm:-translate-y-4' }
    if (rank === 2) return { border: 'border-slate-300 bg-slate-400/10 shadow-md shadow-slate-400/10', badge: '🥈 #2 SILVER', text: 'text-slate-300', height: 'order-2' }
    return { border: 'border-amber-700 bg-amber-800/10 shadow-md shadow-amber-800/10', badge: '🥉 #3 BRONZE', text: 'text-amber-600', height: 'order-3' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0b0e14] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans text-slate-100">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-amber-400 tracking-wide flex items-center gap-2">
                <span>BẢNG XẾP HẠNG</span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Vinh danh Top học viên có điểm số XP cao nhất, chăm chỉ hoàn thành bài học và thực hành CTF Lab
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <span className="text-xs font-mono text-slate-400">Đang tổng hợp dữ liệu bảng xếp hạng...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 text-rose-350 rounded-2xl text-center font-mono">
              ⚠️ {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm italic">
              Chưa có dữ liệu học viên trong bảng xếp hạng. Hãy hoàn thành bài học đầu tiên để ghi danh!
            </div>
          ) : (
            <>
              {/* Top 3 Hào Quang Podium */}
              {topThree.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-center font-mono text-xs text-amber-400/80 uppercase tracking-widest mb-6">
                    TOP 3 HỌC VIÊN XUẤT SẮC
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-4">
                    {topThree.map((userItem, idx) => {
                      const rank = idx + 1
                      const style = getPodiumStyle(rank)
                      const isMe = currentUser && (currentUser.id === userItem.user_id || currentUser._id === userItem.user_id || currentUser.username === userItem.username)
                      return (
                        <div
                          key={userItem.user_id}
                          className={`p-5 rounded-2xl border flex flex-col items-center text-center transition ${style.border} ${style.height} ${
                            isMe ? 'ring-2 ring-amber-400' : ''
                          }`}
                        >
                          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-slate-950 border border-slate-800 mb-3 shadow-inner">
                            {style.badge}
                          </span>
                          
                          <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center overflow-hidden mb-3 shadow-md">
                            {userItem.avatar_url ? (
                              <img src={userItem.avatar_url} alt={userItem.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-mono font-bold text-xl text-slate-400">{userItem.username ? userItem.username.slice(0, 2).toUpperCase() : 'AI'}</span>
                            )}
                          </div>

                          <span className="text-base font-bold font-display truncate w-full flex items-center justify-center gap-1">
                            <span>{userItem.username}</span>
                            {isMe && <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono font-bold">BẠN</span>}
                          </span>

                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800/60 w-full justify-center text-xs font-mono">
                            <span className="flex items-center gap-1 text-amber-400 font-bold">
                              <Zap className="w-3.5 h-3.5 fill-amber-400" />
                              {userItem.xp} XP
                            </span>
                            <span className="flex items-center gap-1 text-rose-400">
                              <Flame className="w-3.5 h-3.5 fill-rose-500" />
                              {userItem.current_streak || 0}d
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Ranks 4+ List Table */}
              {others.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    📋 Bảng Danh Sách Xếp Hạng ({others.length} học viên tiếp theo)
                  </h3>
                  <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-850 bg-slate-900/80 font-mono text-slate-400">
                          <th className="py-3 px-4 w-12 text-center">Hạng</th>
                          <th className="py-3 px-4">Học viên</th>
                          <th className="py-3 px-4 text-center">Hoàn thành</th>
                          <th className="py-3 px-4 text-center">Huy hiệu</th>
                          <th className="py-3 px-4 text-center">Streak</th>
                          <th className="py-3 px-4 text-right">XP score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 font-sans">
                        {others.map((userItem, idx) => {
                          const rank = idx + 4
                          const isMe = currentUser && (currentUser.id === userItem.user_id || currentUser._id === userItem.user_id || currentUser.username === userItem.username)
                          return (
                            <tr
                              key={userItem.user_id}
                              className={`hover:bg-slate-850/50 transition ${isMe ? 'bg-amber-500/10 font-bold' : ''}`}
                            >
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                                #{rank}
                              </td>
                              <td className="py-3.5 px-4 flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {userItem.avatar_url ? (
                                    <img src={userItem.avatar_url} alt={userItem.username} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-mono text-xs text-slate-400">{userItem.username ? userItem.username.slice(0, 2).toUpperCase() : 'AI'}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-display text-sm text-slate-200 block truncate flex items-center gap-1.5">
                                    <span>{userItem.username}</span>
                                    {isMe && <span className="text-[9px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-mono font-bold">BẠN</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-emerald-400">
                                {userItem.completed_lessons || 0} bài
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-purple-400">
                                {userItem.badges_count || 1} 🏆
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-rose-400">
                                🔥 {userItem.current_streak || 0}d
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                                {userItem.xp || 0} XP
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-display text-xs font-bold rounded-xl transition"
          >
            Đóng bảng xếp hạng
          </button>
        </div>
      </div>
    </div>
  )
}

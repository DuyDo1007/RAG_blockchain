import React, { useState } from 'react'
import { MessageSquare, BookOpen, ShieldAlert, Settings, LogOut, Shield, User } from 'lucide-react'

const navItems = [
  { id: 'chat', icon: MessageSquare, label: 'Chat RAG AI' },
  { id: 'audit', icon: ShieldAlert, label: 'Audit Contract' },
  { id: 'roadmap', icon: BookOpen, label: 'Lộ trình học' },
]

const Sidebar = ({ activeTab, onTabChange, user, onLogout }) => {
  const [hoveredItem, setHoveredItem] = useState(null)

  return (
    <div className="w-[76px] flex flex-col items-center py-5 bg-slate-950/80 border-r border-slate-800 relative z-20">
      {/* Logo */}
      <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shield-pulse mb-8 shadow-md shadow-vault-gold/20 border border-amber-500/35 cursor-pointer" onClick={() => onTabChange('chat')}>
        <Shield className="w-6 h-6 text-amber-500" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center space-y-3.5 w-full px-2">
        {navItems.map(({ id, icon: Icon, label }) => (
          <div key={id} className="relative w-full flex justify-center">
            <button
              onClick={() => onTabChange(id)}
              onMouseEnter={() => setHoveredItem(id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`p-3.5 rounded-2xl transition-all duration-200 ${
                activeTab === id
                  ? 'bg-amber-500/10 text-amber-500 shadow-md shadow-vault-gold/10 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
            {hoveredItem === id && (
              <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-950 text-slate-100 text-xs font-semibold rounded-xl whitespace-nowrap animate-fade-in shadow-xl z-50 border border-slate-800 font-display">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-955" style={{ borderRightColor: '#020617' }} />
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-8 h-px bg-slate-800 my-4" />

      {/* User Avatar / Bottom Actions */}
      <div className="flex flex-col items-center space-y-3">
        {user && (
          <div className="relative">
            <div
              onMouseEnter={() => setHoveredItem('user')}
              onMouseLeave={() => setHoveredItem(null)}
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shadow-sm cursor-pointer hover:border-amber-500/30 transition-colors"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="font-mono text-xs">{user.username ? user.username.slice(0, 2).toUpperCase() : 'AI'}</span>
              )}
            </div>
            {hoveredItem === 'user' && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-950 text-slate-100 text-xs font-medium rounded-xl whitespace-nowrap animate-fade-in shadow-xl z-50 border border-slate-800">
                <span className="font-bold text-amber-500 block font-display">{user.username || user.email}</span>
                <span className="text-[10px] text-slate-500 font-mono">{user.email}</span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-955" style={{ borderRightColor: '#020617' }} />
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <button
            onClick={onLogout}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className="p-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all duration-200 border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-5 h-5" />
          </button>
          {hoveredItem === 'logout' && (
            <div className="absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-955 text-rose-400 text-xs font-semibold rounded-xl whitespace-nowrap animate-fade-in shadow-xl z-50 border border-rose-500/20 font-display" style={{ backgroundColor: '#020617' }}>
              Đăng xuất
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-955" style={{ borderRightColor: '#020617' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar

import React, { useState } from 'react'
import { MessageSquare, BookOpen, Settings, LogOut, Shield } from 'lucide-react'

const navItems = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'roadmap', icon: BookOpen, label: 'Lộ trình học' },
]

const Sidebar = ({ activeTab, onTabChange, userEmail, onLogout }) => {
  const [hoveredItem, setHoveredItem] = useState(null)

  return (
    <div className="w-[72px] flex flex-col items-center py-5 glass-strong border-r border-white/5 relative z-10">
      {/* Logo */}
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shield-pulse mb-8">
        <Shield className="w-6 h-6 text-white" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center space-y-2">
        {navItems.map(({ id, icon: Icon, label }) => (
          <div key={id} className="relative">
            <button
              onClick={() => onTabChange(id)}
              onMouseEnter={() => setHoveredItem(id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`p-3 rounded-xl transition-all duration-200 ${
                activeTab === id
                  ? 'bg-cyan-500/15 text-cyan-400 shadow-neon-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
            {/* Tooltip */}
            {hoveredItem === id && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap animate-fade-in shadow-lg z-50 border border-white/10">
                {label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-8 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent my-3" />

      {/* Bottom Actions */}
      <div className="flex flex-col items-center space-y-2">
        <div className="relative">
          <button
            onMouseEnter={() => setHoveredItem('settings')}
            onMouseLeave={() => setHoveredItem(null)}
            className="p-3 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-xl transition-all duration-200"
            title="Cài đặt"
          >
            <Settings className="w-5 h-5" />
          </button>
          {hoveredItem === 'settings' && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap animate-fade-in shadow-lg z-50 border border-white/10">
              Cài đặt
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={onLogout}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className="p-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
          {hoveredItem === 'logout' && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap animate-fade-in shadow-lg z-50 border border-white/10">
              Đăng xuất
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar

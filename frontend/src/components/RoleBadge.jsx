import React from 'react'
import { Shield, ShieldCheck, User, Eye } from 'lucide-react'

const roleConfig = {
  admin: {
    label: 'Admin',
    icon: ShieldCheck,
    bgClass: 'bg-rose-500/10 border-rose-500/30',
    textClass: 'text-rose-400',
    dotClass: 'bg-rose-400',
  },
  user: {
    label: 'User',
    icon: User,
    bgClass: 'bg-cyan-500/10 border-cyan-500/30',
    textClass: 'text-cyan-400',
    dotClass: 'bg-cyan-400',
  },
  guest: {
    label: 'Khách',
    icon: Eye,
    bgClass: 'bg-slate-500/10 border-slate-500/30',
    textClass: 'text-slate-400',
    dotClass: 'bg-slate-400',
  }
}

export default function RoleBadge({ role, compact = false }) {
  const config = roleConfig[role] || roleConfig.guest
  const Icon = config.icon

  if (compact) {
    return (
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${config.bgClass} transition-all hover:scale-110`} title={config.label}>
        <Icon className={`w-3.5 h-3.5 ${config.textClass}`} />
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider ${config.bgClass} ${config.textClass} select-none`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} animate-pulse`} />
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  )
}

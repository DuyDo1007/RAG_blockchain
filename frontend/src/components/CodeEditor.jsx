import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Copy, Check, RotateCcw, Code2 } from 'lucide-react'

export default function CodeEditor({
  value,
  onChange,
  language = 'sol',
  height = '420px',
  readOnly = false
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClear = () => {
    if (onChange && !readOnly) {
      onChange('')
    }
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-xl flex flex-col">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-mono">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold tracking-wider uppercase text-cyan-400">
            {language === 'sol' || language === 'solidity' ? 'Solidity Smart Contract' : language}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Monaco Engine</span>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
              title="Xóa toàn bộ code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors border border-slate-700/50"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sao chép</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full bg-slate-950">
        <Editor
          height={height}
          language={language === 'sol' ? 'solidity' : language}
          value={value}
          onChange={onChange}
          theme="vs-dark"
          options={{
            readOnly: readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>
    </div>
  )
}

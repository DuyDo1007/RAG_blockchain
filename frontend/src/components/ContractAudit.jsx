import React, { useState } from 'react'
import axios from 'axios'
import CodeEditor from './CodeEditor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { API_BASE_URL } from '../contexts/AuthContext'
import { 
  ShieldCheck, Search, Code, AlertTriangle, CheckCircle, 
  Layers, ExternalLink, Loader2, Sparkles, Copy, Check 
} from 'lucide-react'

export default function ContractAudit() {
  const [activeTab, setActiveTab] = useState('address') // 'address' | 'code'
  
  // Address Mode States
  const [address, setAddress] = useState('')
  const [chain, setChain] = useState('ethereum')
  
  // Code Mode States
  const [rawCode, setRawCode] = useState('// Dán mã nguồn Solidity của bạn vào đây để kiểm tra lỗ hổng\npragma solidity ^0.8.20;\n\ncontract VulnerableBank {\n    mapping(address => uint256) public balances;\n\n    function deposit() public payable {\n        balances[msg.sender] += msg.value;\n    }\n\n    function withdraw() public {\n        uint256 bal = balances[msg.sender];\n        require(bal > 0, "No balance");\n\n        (bool sent, ) = msg.sender.call{value: bal}("");\n        require(sent, "Failed to send Ether");\n\n        balances[msg.sender] = 0; // Lỗi Reentrancy tiềm ẩn\n    }\n}')
  const [language, setLanguage] = useState('solidity')

  // Common States
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleAuditAddress = async (e) => {
    e.preventDefault()
    if (!address) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await axios.post(`${API_BASE_URL}/contract/audit`, {
        address: address.trim(),
        chain: chain
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Lỗi khi kiểm định hợp đồng từ Blockchain Explorer.')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeCode = async () => {
    if (!rawCode || rawCode.trim().length < 20) {
      setError('Vui lòng nhập đoạn mã hợp lệ (>20 ký tự).')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await axios.post(`${API_BASE_URL}/contract/analyze`, {
        code: rawCode,
        language: language
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Lỗi khi phân tích mã nguồn hợp đồng.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyResult = () => {
    if (!result?.audit_result) return
    navigator.clipboard.writeText(result.audit_result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const parseSeverities = (text) => {
    if (!text) return { critical: 0, high: 0, medium: 0, low: 0 }
    const getCount = (pattern) => {
      const regex = new RegExp(pattern, 'gi');
      return (text.match(regex) || []).length;
    };
    const critical = getCount('Critical') + getCount('Nghiêm trọng');
    const high = getCount('High') + getCount('Cao');
    const medium = getCount('Medium') + getCount('Trung bình');
    const low = getCount('Low') + getCount('Thấp');
    return { critical, high, medium, low }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-cyber-deep p-6 md:p-8 pb-24 text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="glass-strong border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-semibold font-display">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Agent Smart Contract Auditor</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">
              Kiểm Định & Audit Smart Contract
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Tích hợp Etherscan & BscScan API kết hợp mô hình Agentic RAG chuyên sâu. Phát hiện lỗ hổng Reentrancy, Access Control, Overflow và đề xuất bản patch tự động.
            </p>
          </div>

          {/* Tab Selection Switch */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-850 self-stretch md:self-auto z-10">
            <button
              onClick={() => { setActiveTab('address'); setError(null); setResult(null); }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all font-display ${
                activeTab === 'address'
                  ? 'bg-gradient-to-r from-vault-gold to-amber-600 text-slate-955 shadow-md shadow-vault-gold/15 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Từ Địa Chỉ (Explorer)</span>
            </button>
            <button
              onClick={() => { setActiveTab('code'); setError(null); setResult(null); }}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all font-display ${
                activeTab === 'code'
                  ? 'bg-gradient-to-r from-vault-gold to-amber-600 text-slate-955 shadow-md shadow-vault-gold/15 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Phân Tích Code</span>
            </button>
          </div>
        </div>

        {/* Input Panel */}
        <div className="glass border border-slate-800 rounded-2xl p-6 shadow-xl">
          {activeTab === 'address' ? (
            <form onSubmit={handleAuditAddress} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-display">
                    Địa chỉ Smart Contract (0x...)
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 px-4 text-sm font-mono text-amber-500 placeholder-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-display">
                    Mạng Blockchain
                  </label>
                  <select
                    value={chain}
                    onChange={(e) => setChain(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl py-3 px-4 text-sm font-semibold text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                  >
                    <option value="ethereum">Ethereum (Etherscan)</option>
                    <option value="bsc">BNB Chain (BscScan)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  Yêu cầu contract đã được verify mã nguồn trên Explorer
                </span>

                <button
                  type="submit"
                  disabled={loading || !address}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-vault-gold to-amber-600 font-bold text-sm text-slate-955 shadow-md shadow-vault-gold/15 hover:brightness-110 active:scale-[0.99] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang fetch & Audit...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Bắt Đầu Audit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-display">
                  Trình soạn thảo & Phân tích mã nguồn
                </label>
                <CodeEditor
                  value={rawCode}
                  onChange={setRawCode}
                  language={language}
                  height="360px"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-500 font-display">Ngôn ngữ:</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-500 focus:outline-none focus:border-amber-500"
                  >
                    <option value="solidity">Solidity (.sol)</option>
                    <option value="vyper">Vyper (.vy)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeCode}
                  disabled={loading || !rawCode}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-vault-gold to-amber-600 font-bold text-sm text-slate-955 shadow-md shadow-vault-gold/15 hover:brightness-110 active:scale-[0.99] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI đang quét lỗi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Phân Tích Code Ngay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-start gap-3 text-rose-300 animate-slide-up">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Phát hiện lỗi trong quá trình xử lý</p>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Audit Results Section */}
        {result && (
          <div className="glass-strong border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl animate-fade-in relative min-h-[600px] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-display">
                    Báo Cáo Đánh Giá Bảo Mật AI
                  </h2>
                </div>
                {result.contract_name && (
                  <p className="text-xs text-amber-500 font-mono">
                    Contract: <span className="font-bold">{result.contract_name}</span> 
                    {result.address && ` (${result.address.slice(0,6)}...${result.address.slice(-4)})`}
                    {result.is_cached && <span className="ml-2 px-2 py-0.5 rounded bg-slate-900 text-slate-500 text-[10px] border border-slate-800">Cached</span>}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {result.address && (
                  <a
                    href={`https://${result.chain === 'bsc' ? 'bscscan.com' : 'etherscan.io'}/address/${result.address}#code`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-[11px] font-semibold font-display text-slate-300 transition-colors border border-slate-800"
                  >
                    <span>Xem trên Explorer</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                  </a>
                )}

                <button
                  onClick={handleCopyResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold font-display text-amber-500 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép kết quả'}</span>
                </button>
              </div>
            </div>

            {/* Signature UI: Security Scan HUD (SVG Dial Gauge) */}
            {(() => {
              const severities = parseSeverities(result.audit_result);
              const totalVuls = severities.critical + severities.high + severities.medium + severities.low;
              
              let threatScore = 0;
              if (totalVuls > 0) {
                threatScore = Math.min(
                  100,
                  (severities.critical * 35) + (severities.high * 20) + (severities.medium * 8) + (severities.low * 3)
                );
              }
              
              let statusText = "SECURE - Chưa phát hiện lỗi nguy hiểm";
              let statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
              
              if (severities.critical > 0) {
                statusText = "CRITICAL RISK - Lỗ hổng nghiêm trọng!";
                statusColor = "text-rose-400 border-rose-500/20 bg-rose-500/5";
              } else if (severities.high > 0) {
                statusText = "HIGH RISK - Lỗ hổng mức độ cao!";
                statusColor = "text-amber-500 border-amber-500/20 bg-amber-500/5";
              } else if (severities.medium > 0) {
                statusText = "MEDIUM RISK - Lỗ hổng trung bình";
                statusColor = "text-yellow-500 border-yellow-500/20 bg-yellow-500/5";
              }

              const circumference = 238.7;
              const strokeOffset = circumference - (threatScore / 100) * circumference;
              
              let gaugeColor = "#10b981"; // emerald
              if (severities.critical > 0) {
                gaugeColor = "#f43f5e"; // rose
              } else if (severities.high > 0) {
                gaugeColor = "#df9a28"; // amber/brass
              } else if (severities.medium > 0) {
                gaugeColor = "#eab308"; // yellow
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-inner my-2">
                  <div className="flex flex-col items-center md:items-start justify-center gap-3">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90 threat-gauge-svg" viewBox="0 0 96 96">
                        <circle
                          className="threat-gauge-track"
                          cx="48"
                          cy="48"
                          r="38"
                          strokeWidth="6"
                          fill="transparent"
                        />
                        <circle
                          className="threat-gauge-value"
                          cx="48"
                          cy="48"
                          r="38"
                          strokeWidth="6"
                          fill="transparent"
                          stroke={gaugeColor}
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center font-mono">
                        <span className="text-2xl font-black text-slate-100">{threatScore}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">THREAT</span>
                      </div>
                    </div>

                    <div className="w-full space-y-1.5 text-center md:text-left">
                      <div className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">Chỉ Số Đe Dọa (Threat Score)</div>
                      <div className={`px-3 py-1 rounded-lg border text-center text-xs font-bold font-mono tracking-wide ${statusColor}`}>
                        {statusText}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-wrap gap-4 items-center justify-around">
                    <div className="text-center px-4 py-2 rounded-xl bg-slate-900/40 border border-rose-500/20 shadow-sm min-w-[75px]">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-display">Critical</div>
                      <div className="text-2xl font-black text-rose-500 font-mono">{severities.critical}</div>
                    </div>
                    <div className="text-center px-4 py-2 rounded-xl bg-slate-900/40 border border-amber-500/20 shadow-sm min-w-[75px]">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-display">High</div>
                      <div className="text-2xl font-black text-amber-500 font-mono">{severities.high}</div>
                    </div>
                    <div className="text-center px-4 py-2 rounded-xl bg-slate-900/40 border border-yellow-500/20 shadow-sm min-w-[75px]">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-display">Medium</div>
                      <div className="text-2xl font-black text-yellow-500 font-mono">{severities.medium}</div>
                    </div>
                    <div className="text-center px-4 py-2 rounded-xl bg-slate-900/40 border border-cyan-500/20 shadow-sm min-w-[75px]">
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-display">Low</div>
                      <div className="text-2xl font-black text-cyan-400 font-mono">{severities.low}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Markdown Rendered Content */}
            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 flex-1 my-4">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <div className="my-4 rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                        <div className="bg-slate-900 px-4 py-1.5 border-b border-slate-850 flex justify-between items-center text-xs text-slate-400 font-mono">
                          <span className="text-amber-500">{match[1]}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Audit Suggested Patch</span>
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
                {result.audit_result}
              </ReactMarkdown>
            </div>

            {/* Reference Sources */}
            {result.sources && result.sources.length > 0 && (
              <div className="pt-4 border-t border-slate-800 mt-auto">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2 font-display">
                  Dữ liệu lỗi tham khảo từ RAG Database:
                </span>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((src, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3 h-3 text-amber-500" />
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

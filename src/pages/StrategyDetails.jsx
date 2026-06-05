import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { toast } from '../lib/toast.jsx'
import AiChatBot from '../components/AiChatBot'

const MODULE_ICONS = { Sentiment: '🧠', RiskCheck: '🛡', Executor: '⚡' }

function MetricCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl p-5 border ${highlight ? 'bg-indigo-900/30 border-indigo-600' : 'bg-slate-800 border-slate-700'}`}>
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-indigo-300' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

function SourceBadge({ source }) {
  if (!source) return null
  const isLive = source !== 'mock'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${isLive ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
      {source}
    </span>
  )
}

export default function StrategyDetails() {
  const { id } = useParams()
  const [strategy, setStrategy] = useState(null)
  const [executions, setExecutions] = useState([])
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [aiInsight, setAiInsight] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [sRes, eRes] = await Promise.all([
        api.get(`/strategy/${id}`),
        api.get(`/execution/status/${id}`),
      ])
      setStrategy(sRes.data.strategy)
      setExecutions(eRes.data.recentExecutions || [])
    } catch {
      // pass
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchEarnings = useCallback(async () => {
    try {
      const { data } = await api.get('/earnings/summary')
      setEarnings(data)
    } catch {
      // pass
    }
  }, [])

  // Auto-refresh every 30s while strategy is active
  const pollRef = useRef(null)
  useEffect(() => {
    fetchData()
    fetchEarnings()
    pollRef.current = setInterval(() => {
      fetchData()
      fetchEarnings()
    }, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchData, fetchEarnings])

  const handleExecuteNow = async () => {
    setExecuting(true)
    setLastResult(null)
    try {
      const { data } = await api.post('/execution/execute', { strategyId: id })
      setLastResult(data.result)
      const result = data.result
      if (result?.tradePlaced) {
        toast.success(`Trade executed! Action: ${result.executorOutput?.action}, PnL: ${result.pnl >= 0 ? '+' : ''}${result.pnl?.toFixed(3)}%`)
      } else {
        toast.info(`Execution complete — HOLD (${result?.executorOutput?.reason || 'Risk check failed'})`)
      }
      await fetchData()
      await fetchEarnings()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Execution failed')
    } finally {
      setExecuting(false)
    }
  }

  const handleAiAnalyze = async () => {
    setAiLoading(true)
    try {
      const { data } = await api.get(`/ai/analyze/${id}`)
      setAiInsight(data.insight)
    } catch {
      toast.error('AI analysis failed.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleClaimEarnings = async () => {
    setClaiming(true)
    try {
      const { data } = await api.post('/earnings/claim')
      toast.success(data.message)
      await fetchEarnings()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Claim failed')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto animate-pulse">
      <div className="skeleton h-6 w-64 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="skeleton h-40 rounded-xl mb-6" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  )
  if (!strategy) return (
    <div className="p-8 text-center">
      <p className="text-slate-400">Strategy not found.</p>
      <Link to="/dashboard" className="text-indigo-400 text-sm mt-2 inline-block">← Back to Dashboard</Link>
    </div>
  )

  const { stats = {}, config = {} } = strategy

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm">← Dashboard</Link>
          <span className="text-slate-600">/</span>
          <h1 className="text-xl font-bold text-white">{strategy.name}</h1>
          <span className={`text-xs border px-2 py-0.5 rounded-full ${
            strategy.status === 'active' ? 'bg-green-900/40 text-green-400 border-green-700'
            : strategy.status === 'paused' ? 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
            : 'bg-slate-700/40 text-slate-400 border-slate-600'
          }`}>{strategy.status}</span>
          {strategy.onChainTxHash && (
            <a
              href={`https://testnet.valuechain.xyz/tx/${strategy.onChainTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-mono"
              title="On-chain registration tx"
            >
              ⛓ on-chain
            </a>
          )}
        </div>
        <button
          onClick={handleExecuteNow}
          disabled={executing}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          {executing ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running...
            </>
          ) : '▶ Execute Now'}
        </button>
      </div>

      {/* Live execution result */}
      {lastResult && (
        <div className={`mb-6 rounded-xl border p-4 text-sm ${lastResult.tradePlaced ? 'bg-green-900/20 border-green-700' : 'bg-slate-800 border-slate-600'}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-white">Last Execution:</span>
            <span className="text-slate-300">Sentiment <span className={lastResult.sentimentOutput?.score >= 0 ? 'text-green-400' : 'text-red-400'}>{lastResult.sentimentOutput?.score}</span></span>
            <SourceBadge source={lastResult.sentimentOutput?.source} />
            <span className="text-slate-400">→</span>
            <span className={lastResult.riskOutput?.pass ? 'text-green-400' : 'text-red-400'}>Risk {lastResult.riskOutput?.pass ? '✓' : '✗'}</span>
            <span className="text-slate-400">→</span>
            <span className={lastResult.tradePlaced ? 'text-indigo-400 font-medium' : 'text-slate-400'}>
              {lastResult.executorOutput?.action}
            </span>
            {lastResult.pnl != null && (
              <span className={lastResult.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                PnL: {lastResult.pnl >= 0 ? '+' : ''}{lastResult.pnl.toFixed(3)}%
              </span>
            )}
            {lastResult.txHash && (
              <a href={`https://testnet.valuechain.xyz/tx/${lastResult.txHash}`} target="_blank" rel="noreferrer"
                className="text-indigo-400 text-xs font-mono hover:text-indigo-300">
                ⛓ {lastResult.txHash.slice(0, 12)}...
              </a>
            )}
          </div>
        </div>
      )}

      {/* Performance metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total PnL" value={`${(stats.totalPnL || 0) >= 0 ? '+' : ''}${(stats.totalPnL || 0).toFixed(2)}%`} sub="All time" />
        <MetricCard label="Total Trades" value={stats.totalTrades || 0} />
        <MetricCard label="Win Rate" value={stats.winRate ? `${(stats.winRate * 100).toFixed(0)}%` : '—'} />
        <MetricCard label="Usage Count" value={strategy.usageCount || 0} sub="times activated by others" />
      </div>

      {/* AI Section (Insights + Chat) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h2 className="text-sm font-semibold text-white">AI Strategy Insights</h2>
            </div>
            <button
              onClick={handleAiAnalyze}
              disabled={aiLoading}
              className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {aiLoading
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
                : '✨ Analyze with AI'}
            </button>
          </div>
          <div className="flex-1 bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            {aiInsight ? (
              <p className="text-slate-300 text-sm leading-relaxed">{aiInsight}</p>
            ) : (
              <p className="text-slate-500 text-sm">Click "Analyze with AI" to get GPT-4o-mini insights on your strategy's performance and improvement suggestions.</p>
            )}
          </div>
        </div>
        
        {/* Interactive Chat Bot */}
        <AiChatBot strategyId={id} />
      </div>

      {/* Creator earnings */}
      {earnings && (
        <div className="bg-indigo-900/20 border border-indigo-700 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-indigo-300 mb-2">Creator Earnings (SOSO)</h2>
              <div className="flex gap-6 flex-wrap">
                <div>
                  <p className="text-xs text-slate-400">Total Earned</p>
                  <p className="text-lg font-bold text-white">{earnings.totalSOSO?.toFixed(4)} SOSO</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Pending Claim</p>
                  <p className="text-lg font-bold text-indigo-300">{earnings.pendingSOSO?.toFixed(4)} SOSO</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Claimed</p>
                  <p className="text-lg font-bold text-slate-300">{earnings.claimedSOSO?.toFixed(4)} SOSO</p>
                </div>
                {earnings.onChainPending && earnings.onChainPending !== '0' && (
                  <div>
                    <p className="text-xs text-slate-400">On-chain Claimable</p>
                    <p className="text-lg font-bold text-green-400">{parseFloat(earnings.onChainPending).toFixed(4)} SOSO</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Fee split per execution: 70% creator → 20% module creators → 10% protocol treasury
              </p>
            </div>
            {earnings.pendingSOSO > 0 && (
              <button
                onClick={handleClaimEarnings}
                disabled={claiming}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {claiming ? 'Claiming...' : `Claim ${earnings.pendingSOSO?.toFixed(4)} SOSO`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Module pipeline */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">Strategy Pipeline</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {(config.modules || []).map((mod, i) => (
            <div key={mod.id} className="flex items-center gap-3">
              <div className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 min-w-[140px]">
                <div className="text-xl mb-1">{MODULE_ICONS[mod.type] || '📦'}</div>
                <div className="text-white text-sm font-medium">{mod.type}</div>
                <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                  {Object.entries(mod.config || {}).map(([k, v]) => (
                    <div key={k}>{k}: <span className="text-slate-300">{String(v)}</span></div>
                  ))}
                </div>
              </div>
              {i < (config.modules?.length || 0) - 1 && <span className="text-indigo-500 text-lg">→</span>}
            </div>
          ))}
          {(!config.modules || config.modules.length === 0) && (
            <p className="text-slate-500 text-sm">No modules configured</p>
          )}
        </div>
      </div>

      {/* Execution history */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">Execution History</h2>
            <span className="text-xs text-indigo-400 font-mono mt-1">⚡ Powered by real-time SoSoValue Sentiment Data & SoDEX Execution</span>
          </div>
          <span className="text-xs text-slate-500">{executions.length} executions</span>
        </div>
        {executions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No executions yet — click <span className="text-indigo-400">Execute Now</span> to run the strategy manually.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                  <th className="text-left px-6 py-3">Time</th>
                  <th className="text-right px-6 py-3">Sentiment</th>
                  <th className="text-center px-6 py-3">Risk</th>
                  <th className="text-center px-6 py-3">Action</th>
                  <th className="text-right px-6 py-3">PnL</th>
                  <th className="text-right px-6 py-3">Chain</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex) => (
                  <tr key={ex._id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-6 py-3 text-slate-300 font-mono text-xs">
                      {new Date(ex.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`font-mono text-xs ${(ex.moduleOutputs?.sentiment?.score || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ex.moduleOutputs?.sentiment?.score ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs ${ex.moduleOutputs?.risk?.pass ? 'text-green-400' : 'text-red-400'}`}>
                        {ex.moduleOutputs?.risk?.pass ? '✓ Pass' : '✗ Fail'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-medium ${ex.tradePlaced ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {ex.tradePlaced ? (ex.moduleOutputs?.executor?.action || 'BUY') : 'HOLD'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">
                      {ex.pnl != null
                        ? <span className={ex.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>{ex.pnl >= 0 ? '+' : ''}{ex.pnl.toFixed(3)}%</span>
                        : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-xs">
                      {ex.onChainTxHash ? (
                        <a href={`https://testnet.valuechain.xyz/tx/${ex.onChainTxHash}`} target="_blank" rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300">
                          {ex.onChainTxHash.slice(0, 10)}...
                        </a>
                      ) : <span className="text-slate-600">off-chain</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

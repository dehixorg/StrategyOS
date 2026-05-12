import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { toast } from '../lib/toast.jsx'

function SkeletonCard() {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="skeleton h-5 w-2/3 mb-3" />
      <div className="skeleton h-3 w-full mb-2" />
      <div className="skeleton h-3 w-4/5 mb-4" />
      <div className="flex gap-3">
        <div className="skeleton h-8 w-20" />
        <div className="skeleton h-8 w-28" />
      </div>
    </div>
  )
}

function StatPill({ label, value, color = 'text-slate-300' }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

// Demo strategies shown when no active strategies exist in DB yet
const DEMO_STRATEGIES = [
  {
    _id: 'demo1', name: 'BTC Momentum Sentinel', status: 'active',
    usageCount: 47,
    stats: { totalTrades: 134, totalPnL: 12.4, winRate: 0.61, sharpeRatio: 1.8 },
    config: { modules: [{ type: 'Sentiment' }, { type: 'RiskCheck' }, { type: 'Executor' }] },
    earnings: { totalSOSO: 13.4 },
  },
  {
    _id: 'demo2', name: 'ETH Safe Accumulator', status: 'active',
    usageCount: 31,
    stats: { totalTrades: 89, totalPnL: 7.2, winRate: 0.55, sharpeRatio: 1.3 },
    config: { modules: [{ type: 'Sentiment' }, { type: 'RiskCheck' }, { type: 'Executor' }] },
    earnings: { totalSOSO: 8.9 },
  },
  {
    _id: 'demo3', name: 'Low-Risk DeFi Scanner', status: 'active',
    usageCount: 19,
    stats: { totalTrades: 54, totalPnL: 4.8, winRate: 0.67, sharpeRatio: 2.1 },
    config: { modules: [{ type: 'Sentiment' }, { type: 'RiskCheck' }] },
    earnings: { totalSOSO: 5.4 },
  },
]

export default function ExploreStrategies() {
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/strategy/marketplace/top')
        setStrategies(data.strategies?.length > 0 ? data.strategies : DEMO_STRATEGIES)
      } catch {
        setStrategies(DEMO_STRATEGIES)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleCopyAndActivate = async (strategy) => {
    if (strategy._id.startsWith('demo')) {
      toast.info('This is a demo strategy. Build your own in the Builder!')
      navigate('/builder')
      return
    }
    setActivating(strategy._id)
    try {
      // Clone the strategy for the current user
      const { data } = await api.post('/strategy/create', {
        name: `${strategy.name} (copy)`,
        modules: strategy.config?.modules || [],
        connections: strategy.config?.connections || [],
      })
      await api.post('/execution/activate', { strategyId: data.strategyId })
      toast.success(`"${strategy.name}" copied and activated! Runs every 5 min.`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate strategy.')
    } finally {
      setActivating(null)
    }
  }

  const MODULE_ICONS = { Sentiment: '🧠', RiskCheck: '🛡', Executor: '⚡' }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Explore Strategies</h1>
        <p className="text-slate-400 text-sm mt-1">
          Copy and activate strategies built by the community. Every trade earns the original creator <span className="text-indigo-400 font-medium">SOSO tokens</span>.
        </p>
      </div>

      {/* How it works banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-700 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">How the Creator Economy Works</h3>
          <p className="text-slate-300 text-sm">
            When you activate someone's strategy, every trade it executes pays <strong className="text-white">0.1 SOSO</strong> automatically via the StrategyOS contract on ValueChain:
            <span className="text-green-400 font-medium ml-1">70%</span> to the strategy creator,
            <span className="text-indigo-400 font-medium ml-1">20%</span> to module creators,
            <span className="text-slate-400 ml-1">10%</span> to protocol treasury.
          </p>
        </div>
        <button
          onClick={() => navigate('/builder')}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Create Your Strategy →
        </button>
      </div>

      {/* Strategy grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((s) => (
            <div key={s._id}
              className="bg-slate-800 border border-slate-700 hover:border-indigo-600 rounded-xl p-5 transition-all flex flex-col">

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-sm leading-tight">{s.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-400 bg-green-900/30 border border-green-800 px-1.5 py-0.5 rounded-full">
                      {s.status}
                    </span>
                    <span className="text-xs text-slate-500">{s.usageCount || 0} users</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Creator earned</p>
                  <p className="text-sm font-bold text-indigo-400">{(s.earnings?.totalSOSO || 0).toFixed(2)} SOSO</p>
                </div>
              </div>

              {/* Module pipeline preview */}
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {(s.config?.modules || []).map((mod, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-300 flex items-center gap-1">
                      {MODULE_ICONS[mod.type] || '📦'} {mod.type}
                    </span>
                    {i < (s.config?.modules?.length || 0) - 1 && (
                      <span className="text-indigo-600 text-xs">→</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-900/60 rounded-lg px-3 py-2">
                <StatPill
                  label="Trades"
                  value={s.stats?.totalTrades || 0}
                />
                <StatPill
                  label="PnL"
                  value={`${(s.stats?.totalPnL || 0) >= 0 ? '+' : ''}${(s.stats?.totalPnL || 0).toFixed(1)}%`}
                  color={(s.stats?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <StatPill
                  label="Win Rate"
                  value={s.stats?.winRate ? `${(s.stats.winRate * 100).toFixed(0)}%` : '—'}
                  color="text-blue-400"
                />
                <StatPill
                  label="Sharpe"
                  value={s.stats?.sharpeRatio ? s.stats.sharpeRatio.toFixed(1) : '—'}
                  color="text-purple-400"
                />
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => handleCopyAndActivate(s)}
                  disabled={activating === s._id}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  {activating === s._id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Activating...
                    </span>
                  ) : '▶ Use This Strategy'}
                </button>
                {!s._id.startsWith('demo') && (
                  <button
                    onClick={() => navigate(`/strategy/${s._id}`)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs px-3 py-2 rounded-lg transition-colors"
                  >
                    Details
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && strategies.length === 0 && (
        <div className="text-center py-20 bg-slate-800/40 rounded-xl border border-slate-700">
          <p className="text-4xl mb-4">🏗️</p>
          <p className="text-slate-300 text-lg font-medium mb-2">No public strategies yet</p>
          <p className="text-slate-500 text-sm mb-6">Be the first to publish a strategy and start earning SOSO tokens.</p>
          <button onClick={() => navigate('/builder')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
            Build First Strategy
          </button>
        </div>
      )}
    </div>
  )
}

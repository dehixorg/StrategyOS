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
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  )
}

const DEMO_STRATEGIES = [
  {
    _id: 'demo1', name: 'SoSoValue AI Sentiment Alpha', status: 'active',
    usageCount: 142,
    stats: { totalTrades: 142, totalPnL: 84.50, winRate: 0.68, sharpeRatio: 2.1 },
    config: { modules: [{ type: 'Sentiment' }, { type: 'RiskCheck' }, { type: 'Executor' }] },
    earnings: { totalSOSO: 42.6 },
  },
  {
    _id: 'demo2', name: 'ETH Safe Accumulator', status: 'active',
    usageCount: 89,
    stats: { totalTrades: 89, totalPnL: 37.2, winRate: 0.55, sharpeRatio: 1.3 },
    config: { modules: [{ type: 'RiskCheck' }, { type: 'Executor' }] },
    earnings: { totalSOSO: 8.9 },
  },
  {
    _id: 'demo3', name: 'Low-Risk DeFi Scanner', status: 'active',
    usageCount: 54,
    stats: { totalTrades: 54, totalPnL: 14.8, winRate: 0.67, sharpeRatio: 1.1 },
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
        const fetched = data.strategies?.length > 0 ? data.strategies : DEMO_STRATEGIES
        // Sort by PnL
        const sorted = [...fetched].sort((a, b) => (b.stats?.totalPnL || 0) - (a.stats?.totalPnL || 0))
        setStrategies(sorted)
      } catch {
        setStrategies(DEMO_STRATEGIES)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSubscribe = async (strategy) => {
    const walletAddress = localStorage.getItem('walletAddress')
    if (!walletAddress || !window.ethereum) {
      toast.error('Connect your Web3 Wallet (top right) to subscribe to a strategy vault.')
      return
    }

    setActivating(strategy._id)
    try {
      // 1. Web3 Signature for Allocation
      const message = `Authorize StrategyOS to allocate simulated USDC to vault: ${strategy.name}`
      const msgHex = `0x${Buffer.from(message, 'utf8').toString('hex')}`
      
      toast.info('Please sign the allocation request in MetaMask...')
      await window.ethereum.request({
        method: 'personal_sign',
        params: [msgHex, walletAddress],
      })

      if (strategy._id.startsWith('demo')) {
        toast.success(`Successfully allocated funds to demo vault!`)
        return
      }

      // 2. Clone strategy
      const { data } = await api.post('/strategy/create', {
        name: `${strategy.name} (Subscribed)`,
        modules: strategy.config?.modules || [],
        connections: strategy.config?.connections || [],
      })
      await api.post('/execution/activate', { strategyId: data.strategyId })
      
      toast.success(`Successfully subscribed to "${strategy.name}"! Funds allocated.`)
      navigate('/dashboard')
    } catch (err) {
      if (err.code === 4001) {
        toast.error('Signature rejected. Allocation cancelled.')
      } else {
        toast.error(err.response?.data?.message || 'Failed to subscribe to strategy.')
      }
    } finally {
      setActivating(null)
    }
  }

  const MODULE_ICONS = { Sentiment: '🧠', RiskCheck: '🛡', Executor: '⚡' }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Global Strategy Leaderboard</h1>
        <p className="text-slate-400 text-sm">
          Ranked by highest all-time returns. Connect your wallet to subscribe and automatically mirror top managers.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {strategies.map((s, index) => {
            const isTop1 = index === 0
            const usesSosoValue = s.config?.modules?.some(m => m.type === 'Sentiment')
            
            return (
              <div key={s._id} className={`relative bg-slate-800 rounded-2xl overflow-hidden transition-all ${
                isTop1 ? 'border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : 'border border-slate-700 hover:border-indigo-500/50'
              }`}>
                {/* Rank Badge */}
                <div className={`absolute top-0 left-0 w-16 h-16 flex items-center justify-center font-bold text-2xl rounded-br-3xl ${
                  isTop1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-950' : 
                  index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900' :
                  index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  #{index + 1}
                </div>

                <div className="pl-20 pr-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  {/* Left: Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-bold text-xl ${isTop1 ? 'text-yellow-400' : 'text-white'}`}>{s.name}</h3>
                      {usesSosoValue && (
                        <span className="bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1">
                          ✨ Verified by SoSoValue
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {(s.config?.modules || []).map((mod, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="bg-slate-900/50 border border-slate-600/50 rounded-md px-2 py-1 text-xs text-slate-300">
                            {MODULE_ICONS[mod.type] || '📦'} {mod.type}
                          </span>
                          {i < (s.config?.modules?.length || 0) - 1 && <span className="text-slate-500 text-xs">→</span>}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">👥 {s.usageCount || 0} Subscribers</span>
                      <span className="flex items-center gap-1">🏆 {(s.earnings?.totalSOSO || 0).toFixed(2)} SOSO Earned</span>
                    </div>
                  </div>

                  {/* Right: Stats & Action */}
                  <div className="flex items-center gap-8 bg-slate-900/40 rounded-xl p-4 border border-slate-700/50 shrink-0">
                    <div className="flex gap-6">
                      <StatPill label="All-Time PnL" value={`${(s.stats?.totalPnL || 0) >= 0 ? '+' : ''}${(s.stats?.totalPnL || 0).toFixed(1)}%`} color={(s.stats?.totalPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
                      <StatPill label="Win Rate" value={s.stats?.winRate ? `${(s.stats.winRate * 100).toFixed(0)}%` : '—'} color="text-sky-400" />
                      <StatPill label="Sharpe" value={s.stats?.sharpeRatio ? s.stats.sharpeRatio.toFixed(1) : '—'} color="text-violet-400" />
                    </div>
                    
                    <button
                      onClick={() => handleSubscribe(s)}
                      disabled={activating === s._id}
                      className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        isTop1 ? 'bg-yellow-500 hover:bg-yellow-400 text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {activating === s._id ? (
                        <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Approving...</>
                      ) : 'Subscribe Vault'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

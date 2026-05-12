import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

// Fallback hardcoded modules if backend is not yet seeded
const FALLBACK_MODULES = [
  {
    id: 'm1', name: 'SoSoValue Sentiment', category: 'Sentiment', type: 'Sentiment',
    creator: 'SoSoValue Labs', rating: 4.8, usageCount: 1240, price: 0,
    description: 'Real-time market sentiment synthesised from SoSoValue price momentum, news volume, and sector spotlight data via the official SoSoValue API.',
    tags: ['sentiment', 'NLP', 'real-time', 'sosovalue'],
  },
  {
    id: 'm2', name: 'Advanced Risk Manager', category: 'Risk', type: 'RiskCheck',
    creator: 'DeFi Guard', rating: 4.6, usageCount: 870, price: 0.5,
    description: 'Dynamic position sizing with configurable stop-loss, take-profit, and max portfolio exposure limits.',
    tags: ['risk', 'portfolio', 'stop-loss'],
  },
  {
    id: 'm3', name: 'SoDEX Executor', category: 'Execution', type: 'Executor',
    creator: 'SoDEX Team', rating: 4.9, usageCount: 2100, price: 0,
    description: 'Execute signed EIP-712 orders on SoDEX (ValueChain) with optimal routing and slippage protection.',
    tags: ['execution', 'SoDEX', 'ValueChain', 'EIP712'],
  },
  {
    id: 'm4', name: 'Volatility Filter', category: 'Risk', type: 'RiskCheck',
    creator: 'AlgoTrader Pro', rating: 4.3, usageCount: 430, price: 1.0,
    description: 'Pauses trading during extreme volatility spikes using ATR-based thresholds.',
    tags: ['volatility', 'ATR', 'filter'],
  },
  {
    id: 'm5', name: 'Multi-Exchange Executor', category: 'Execution', type: 'Executor',
    creator: 'CrossChain Labs', rating: 4.5, usageCount: 650, price: 2.0,
    description: 'Route orders across SoDEX, Uniswap, and dYdX for best-price execution.',
    tags: ['execution', 'multi-exchange', 'routing'],
  },
  {
    id: 'm6', name: 'On-Chain Sentiment', category: 'Sentiment', type: 'Sentiment',
    creator: 'Nansen AI', rating: 4.7, usageCount: 780, price: 1.5,
    description: 'Uses on-chain whale movement data and exchange inflow/outflow for sentiment signals.',
    tags: ['on-chain', 'whale', 'data'],
  },
]

const CATEGORIES = ['All', 'Sentiment', 'Risk', 'Execution']

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-yellow-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-slate-400 text-xs ml-0.5">{rating}</span>
    </div>
  )
}

export default function Marketplace() {
  const [modules, setModules] = useState(FALLBACK_MODULES)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('rating')
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = {}
        if (category !== 'All') params.category = category
        if (sortBy) params.sortBy = sortBy
        const { data } = await api.get('/module/browse', { params })
        if (data.modules?.length > 0) setModules(data.modules)
      } catch {
        // use fallback
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [category, sortBy])

  const filtered = modules.filter((m) => {
    const matchCat = category === 'All' || m.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || (m.tags || []).some((t) => t.includes(q))
    return matchCat && matchSearch
  })

  const handleAddToBuilder = (mod) => {
    // Store selected module in sessionStorage so Builder can pre-add it
    sessionStorage.setItem('pendingModule', JSON.stringify({ type: mod.type, name: mod.name }))
    setAdded(mod.id)
    setTimeout(() => navigate('/builder'), 600)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Module Marketplace</h1>
        <p className="text-slate-400 text-sm mt-1">
          Browse AI modules. Each execution earns creators SOSO tokens — 70% strategy creator, 20% module creators.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 w-full sm:w-64"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${category === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="rating">Sort: Rating</option>
            <option value="usage">Sort: Most Used</option>
            <option value="price">Sort: Price (low)</option>
          </select>
        </div>
      </div>

      {/* Module grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading modules...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mod) => (
            <div key={mod.id || mod._id}
              className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-indigo-600 transition-all flex flex-col group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <span className={`text-xs border px-2 py-0.5 rounded-full mb-2 inline-block ${
                    mod.category === 'Sentiment' ? 'bg-purple-900/40 text-purple-400 border-purple-700'
                    : mod.category === 'Risk' ? 'bg-amber-900/40 text-amber-400 border-amber-700'
                    : 'bg-green-900/40 text-green-400 border-green-700'
                  }`}>
                    {mod.category}
                  </span>
                  <h3 className="text-white font-semibold text-sm leading-tight">{mod.name}</h3>
                </div>
                <span className="text-sm font-semibold text-indigo-400 whitespace-nowrap ml-3">
                  {mod.price === 0 ? 'Free' : `${mod.price} USDC/mo`}
                </span>
              </div>

              <p className="text-slate-400 text-xs mb-3 flex-1 leading-relaxed">{mod.description}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {(mod.tags || []).map((tag) => (
                  <span key={tag} className="text-xs bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full">#{tag}</span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <StarRating rating={mod.rating || 5} />
                  <p className="text-xs text-slate-500 mt-1">
                    {(mod.usageCount || 0).toLocaleString()} uses · {mod.creator || 'Community'}
                  </p>
                </div>
                <button
                  onClick={() => handleAddToBuilder(mod)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    added === (mod.id || mod._id)
                      ? 'bg-green-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {added === (mod.id || mod._id) ? '✓ Opening Builder...' : 'Add to Builder'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">No modules found matching your search.</div>
      )}

      {/* SOSO earnings explainer */}
      <div className="mt-10 bg-indigo-900/20 border border-indigo-800 rounded-xl p-6">
        <h3 className="text-indigo-300 font-semibold mb-2">How Module Creator Earnings Work</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          Every time a strategy executes a trade, a <span className="text-white font-medium">0.1 SOSO</span> fee is distributed automatically via the StrategyOS smart contract on ValueChain.
          Strategy creators receive <span className="text-green-400 font-medium">70%</span>,
          module creators split <span className="text-indigo-400 font-medium">20%</span>,
          and <span className="text-slate-300 font-medium">10%</span> goes to the protocol treasury.
          Earnings accumulate on-chain and can be claimed anytime via <code className="bg-slate-800 px-1 rounded text-xs">claimEarnings()</code>.
        </p>
      </div>
    </div>
  )
}

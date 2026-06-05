import { useState, useEffect } from 'react'
import api from '../lib/api'

const PAIRS = ['BTC/USD', 'ETH/USD', 'SOL/USD']

function ScoreBar({ score }) {
  const pct   = ((score + 100) / 200) * 100
  const color = score > 20 ? 'bg-green-500' : score < -20 ? 'bg-red-500' : 'bg-yellow-500'
  return (
    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function SentimentLabel({ score }) {
  if (score >= 50)  return <span className="text-green-400 font-medium">Bullish</span>
  if (score >= 15)  return <span className="text-green-300">Slightly Bullish</span>
  if (score >= -15) return <span className="text-yellow-400">Neutral</span>
  if (score >= -50) return <span className="text-red-300">Slightly Bearish</span>
  return <span className="text-red-400 font-medium">Bearish</span>
}

export default function SentimentTicker() {
  const [data, setData]     = useState({})
  const [prices, setPrices] = useState({})
  const [etfs, setEtfs]     = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchAll = async () => {
    const results = await Promise.allSettled(
      PAIRS.map((pair) => {
        const symbol = pair.split('/')[0]
        return Promise.all([
          api.get(`/market/sentiment?pair=${encodeURIComponent(pair)}`),
          api.get(`/market/price?pair=${encodeURIComponent(pair)}`),
          // Only BTC and ETH have US Spot ETFs
          (symbol === 'BTC' || symbol === 'ETH') 
            ? api.get(`/market/etf-flows?symbol=${symbol}`)
            : Promise.resolve({ data: { data: [] } })
        ])
      })
    )
    const newData   = {}
    const newPrices = {}
    const newEtfs   = {}
    
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const [sentRes, priceRes, etfRes] = r.value
        newData[PAIRS[i]]   = sentRes.data.data
        newPrices[PAIRS[i]] = priceRes.data.data
        
        const flows = etfRes.data.data
        if (flows && flows.length > 0) {
          newEtfs[PAIRS[i]] = flows[0].total_net_inflow
        }
      }
    })
    setData(newData)
    setPrices(newPrices)
    setEtfs(newEtfs)
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex gap-4">
          {PAIRS.map((p) => <div key={p} className="skeleton h-24 flex-1 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Live Sentiment & ETF Flows — powered by SoSoValue</span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-slate-600">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PAIRS.map((pair) => {
          const s = data[pair]
          const p = prices[pair]
          const flow = etfs[pair]
          if (!s) return null
          
          return (
            <div key={pair} className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white text-sm font-bold flex items-center gap-1.5">
                  {pair.replace('/USD', '')}
                  {flow !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono ${parseFloat(flow) >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {parseFloat(flow) >= 0 ? 'INFLOW' : 'OUTFLOW'} ${(Math.abs(parseFloat(flow)) / 1e6).toFixed(1)}M
                    </span>
                  )}
                </span>
                <div className="text-right">
                  {p?.price && (
                    <p className="text-white text-xs font-mono">${p.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  )}
                  {p?.change24h != null && (
                    <p className={`text-xs font-mono ${p.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.change24h >= 0 ? '+' : ''}{p.change24h.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
              
              <ScoreBar score={s.score} />
              
              <div className="flex items-center justify-between mt-2">
                <SentimentLabel score={s.score} />
                <span className={`text-xs font-mono font-bold ${s.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.score >= 0 ? '+' : ''}{s.score}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Data sources: Price, News, Sectors{flow !== undefined ? ', ETFs' : ''}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

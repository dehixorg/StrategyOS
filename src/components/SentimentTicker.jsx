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
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchAll = async () => {
    const results = await Promise.allSettled(
      PAIRS.map((pair) =>
        Promise.all([
          api.get(`/market/sentiment?pair=${encodeURIComponent(pair)}`),
          api.get(`/market/price?pair=${encodeURIComponent(pair)}`),
        ])
      )
    )
    const newData   = {}
    const newPrices = {}
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        const [sentRes, priceRes] = r.value
        newData[PAIRS[i]]   = sentRes.data.data
        newPrices[PAIRS[i]] = priceRes.data.data
      }
    })
    setData(newData)
    setPrices(newPrices)
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
          {PAIRS.map((p) => <div key={p} className="skeleton h-20 flex-1 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Live Sentiment — powered by SoSoValue API</span>
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
          if (!s) return null
          return (
            <div key={pair} className="bg-slate-900/60 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white text-sm font-semibold">{pair.replace('/USD', '')}</span>
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
              <div className="flex items-center justify-between mt-1.5">
                <SentimentLabel score={s.score} />
                <span className={`text-xs font-mono font-bold ${s.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {s.score >= 0 ? '+' : ''}{s.score}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Conf: {(s.confidence * 100).toFixed(0)}%
                {s.source === 'sosovalue' ? ' · live' : ' · mock'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

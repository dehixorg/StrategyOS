import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { toast } from '../lib/toast.jsx'
import SentimentTicker from '../components/SentimentTicker'

const STATUS_COLOR = {
  active:  'bg-green-900/40 text-green-400 border-green-700',
  paused:  'bg-yellow-900/40 text-yellow-400 border-yellow-700',
  draft:   'bg-slate-700/40 text-slate-400 border-slate-600',
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-700/50">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export default function Dashboard() {
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const navigate = useNavigate()

  const fetchStrategies = async () => {
    try {
      const { data } = await api.get('/strategy/my-strategies')
      setStrategies(data.strategies || [])
    } catch {
      toast.error('Failed to load strategies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStrategies() }, [])

  const handleActivate = async (id) => {
    setActionId(id)
    try {
      await api.post('/execution/activate', { strategyId: id })
      toast.success('Strategy activated — auto-runs every 5 minutes.')
      fetchStrategies()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate.')
    } finally {
      setActionId(null)
    }
  }

  const handlePause = async (id) => {
    setActionId(id)
    try {
      await api.post('/execution/pause', { strategyId: id })
      toast.info('Strategy paused.')
      fetchStrategies()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pause.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Strategies</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and monitor your AI trading strategies</p>
        </div>
        <button
          onClick={() => navigate('/builder')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Strategy
        </button>
      </div>

      <SentimentTicker />

      {loading ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <tbody>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
          </table>
        </div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-24 bg-slate-800/40 rounded-xl border border-slate-700">
          <p className="text-4xl mb-4">🧠</p>
          <p className="text-slate-300 text-lg font-medium mb-2">No strategies yet</p>
          <p className="text-slate-500 text-sm mb-6">Build your first AI trading strategy using the drag-drop builder.</p>
          <button
            onClick={() => navigate('/builder')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Open Builder
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-right px-6 py-3">Total PnL</th>
                <th className="text-right px-6 py-3">Trades</th>
                <th className="text-right px-6 py-3">Win Rate</th>
                <th className="text-right px-6 py-3">Earnings (SOSO)</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((s) => (
                <tr key={s._id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{s.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] || STATUS_COLOR.draft}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono text-xs ${(s.stats?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(s.stats?.totalPnL || 0) >= 0 ? '+' : ''}{(s.stats?.totalPnL || 0).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300 text-xs">{s.stats?.totalTrades || 0}</td>
                  <td className="px-6 py-4 text-right text-slate-300 text-xs">
                    {s.stats?.winRate ? `${(s.stats.winRate * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-indigo-400 text-xs font-mono">
                    {(s.earnings?.totalSOSO || 0).toFixed(3)} SOSO
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/strategy/${s._id}`} className="text-indigo-400 hover:text-indigo-300 text-xs">
                        View
                      </Link>
                      {s.status !== 'active' ? (
                        <button
                          onClick={() => handleActivate(s._id)}
                          disabled={actionId === s._id}
                          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-2.5 py-1 rounded-md transition-colors"
                        >
                          {actionId === s._id ? '...' : 'Activate'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePause(s._id)}
                          disabled={actionId === s._id}
                          className="bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white text-xs px-2.5 py-1 rounded-md transition-colors"
                        >
                          {actionId === s._id ? '...' : 'Pause'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

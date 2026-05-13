import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { toast } from '../lib/toast.jsx'

const MODULE_TYPES = ['Sentiment', 'RiskCheck', 'Executor']
const CATEGORIES   = ['Sentiment', 'Risk', 'Execution']

export default function PublishModule() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', category: 'Sentiment', type: 'Sentiment',
    description: '', tags: '', price: 0,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.description.trim()) {
      toast.error('Name and description are required.')
      return
    }
    setSaving(true)
    try {
      const wallet = localStorage.getItem('walletAddress')
      await api.post('/module/publish', {
        ...form,
        price: parseFloat(form.price) || 0,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        creatorWallet: wallet,
      })
      toast.success('Module published! It will appear in the marketplace.')
      navigate('/marketplace')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish module.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Publish a Module</h1>
        <p className="text-slate-400 text-sm mt-1">
          Every time your module is used in a strategy execution, you earn <span className="text-indigo-400 font-medium">20% of 0.1 SOSO</span> split with other module creators.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="text-sm text-slate-300 block mb-1.5">Module Name</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. BTC Momentum Filter"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {/* Category + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-300 block mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => { set('category', e.target.value); set('type', MODULE_TYPES[CATEGORIES.indexOf(e.target.value)]) }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-300 block mb-1.5">Module Type</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {MODULE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-slate-300 block mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe what your module does, what signals it uses..."
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
            required
          />
        </div>

        {/* Tags + Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-300 block mb-1.5">Tags (comma separated)</label>
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="momentum, BTC, on-chain"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 block mb-1.5">Price (USDC/month, 0 = free)</label>
            <input
              type="number" min="0" step="0.1"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Earnings explainer */}
        <div className="bg-indigo-900/20 border border-indigo-800 rounded-xl p-4 text-sm text-slate-400">
          <p className="text-indigo-300 font-medium mb-1">Creator Earnings</p>
          When a strategy that uses your module executes a trade, you automatically earn a share of the <span className="text-white">0.1 SOSO</span> execution fee.
          Earnings are sent to your connected wallet: <span className="text-indigo-400 font-mono text-xs">{localStorage.getItem('walletAddress') || 'Connect wallet first'}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/marketplace')}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-xl text-sm transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            {saving ? 'Publishing...' : '🚀 Publish Module'}
          </button>
        </div>
      </form>
    </div>
  )
}

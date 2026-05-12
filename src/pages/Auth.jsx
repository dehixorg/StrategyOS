import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
      const { data } = await api.post(endpoint, { email, password })
      if (data.token) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('userId', data.userId)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-400 tracking-tight">StrategyOS</h1>
          <p className="text-slate-400 mt-2">No-code AI strategy marketplace for DeFi</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

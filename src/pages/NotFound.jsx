import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-8xl font-bold text-indigo-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 mb-8">This page doesn't exist or was moved.</p>
        <Link to="/dashboard" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

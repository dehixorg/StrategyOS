import { Link, useLocation, useNavigate } from 'react-router-dom'
import WalletConnect from './WalletConnect'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/builder', label: 'Builder' },
  { to: '/strategies', label: 'Explore' },
  { to: '/marketplace', label: 'Marketplace' },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    navigate('/auth')
  }

  return (
    <nav className="border-b border-slate-700 bg-slate-800 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-indigo-400 font-bold text-lg tracking-tight shrink-0">
          StrategyOS
        </Link>
        <div className="flex gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === to
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <WalletConnect />
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

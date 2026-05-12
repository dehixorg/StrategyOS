import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Builder from './pages/Builder'
import StrategyDetails from './pages/StrategyDetails'
import Marketplace from './pages/Marketplace'
import ExploreStrategies from './pages/ExploreStrategies'
import NotFound from './pages/NotFound'
import Navbar from './components/Navbar'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/auth" replace />
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Navbar />
              <Routes>
                <Route path="/dashboard"      element={<Dashboard />} />
                <Route path="/builder"        element={<Builder />} />
                <Route path="/strategy/:id"   element={<StrategyDetails />} />
                <Route path="/marketplace"    element={<Marketplace />} />
                <Route path="/strategies"     element={<ExploreStrategies />} />
                <Route path="/"              element={<Navigate to="/dashboard" replace />} />
                <Route path="*"              element={<NotFound />} />
              </Routes>
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  )
}

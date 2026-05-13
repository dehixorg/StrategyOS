import { Link } from 'react-router-dom'

const PROBLEMS = [
  { icon: '🔒', title: 'No Code Access', desc: 'Building trading bots requires deep engineering skills — inaccessible to 99% of retail traders.' },
  { icon: '🧩', title: 'Siloed AI Models', desc: 'Sentiment & prediction models exist but can\'t be composed into a single automated strategy.' },
  { icon: '💸', title: 'Can\'t Monetize', desc: 'Strategy creators have no way to earn when others use their approach. $0 earned by most.' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: '🎨', title: 'Build', desc: 'Drag-drop AI modules (Sentiment → Risk → Executor) onto a canvas. Set parameters per module. Or describe your strategy to AI in plain English.' },
  { step: '02', icon: '⛓', title: 'Deploy', desc: 'Smart contract stores your strategy config on-chain. TX hash on Arbitrum — immutable proof of your strategy.' },
  { step: '03', icon: '⚡', title: 'Execute', desc: 'Every 5 min: fetch live data → run AI → risk check → place signed trade on SoDEX → log result on-chain.' },
  { step: '04', icon: '📊', title: 'Monitor', desc: 'Dashboard shows PnL, win rate, Sharpe ratio, and detailed per-trade AI decision logs in real time.' },
]

const FEATURES = [
  { icon: '✨', title: 'AI Strategy Generator', desc: 'Describe your strategy in plain English. GPT-4o-mini builds the full pipeline in seconds — no coding required.' },
  { icon: '🧠', title: 'Live Sentiment Engine', desc: 'Real-time sentiment from SoSoValue API — price momentum, ETF institutional flows, news volume, and sector performance.' },
  { icon: '🛡', title: 'Risk Management', desc: 'Configurable position sizing, stop-loss, and take-profit. Never risk more than you set.' },
  { icon: '🏪', title: 'Module Marketplace', desc: 'Browse and use community-built AI modules. Publish your own and earn SOSO on every execution.' },
  { icon: '💎', title: 'Creator Earnings', desc: '70% to strategy creator · 20% to module creators · 10% to treasury — distributed automatically via smart contract.' },
  { icon: '🔗', title: 'On-Chain Proof', desc: 'Every execution logged on Arbitrum Sepolia. Verifiable, immutable, transparent trade history forever.' },
]

const STATS = [
  { value: '10M+', label: 'Active retail traders globally' },
  { value: '$50B+', label: 'Annual DeFi trading volume' },
  { value: '80%', label: 'Trade on emotion, not data' },
  { value: '0', label: 'Code required to build a strategy' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <span className="text-indigo-400 font-bold text-xl tracking-tight">StrategyOS</span>
        <div className="flex items-center gap-3">
          <a href="/StrategyOS_PitchDeck.pdf" target="_blank" rel="noreferrer"
            className="text-slate-400 hover:text-white text-sm transition-colors">
            Pitch Deck ↗
          </a>
          <Link to="/auth"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Launch App →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-900/40 border border-indigo-700 rounded-full px-4 py-1.5 text-indigo-300 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          SoSoValue Buildathon · May 2026 · Live on Arbitrum Sepolia
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
          Figma for<br />
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Trading Strategies
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          No-code AI strategy builder with on-chain execution. Drag, drop, deploy.
          Earn SOSO tokens when others use your strategies.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/auth"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-indigo-900/50">
            Start Building Free →
          </Link>
          <a href="/StrategyOS_PitchDeck.pdf" target="_blank" rel="noreferrer"
            className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-medium px-8 py-3.5 rounded-xl text-base transition-all flex items-center gap-2">
            <span>📄</span> Download Pitch Deck
          </a>
        </div>

        {/* Demo credentials */}
        <div className="mt-8 inline-flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-sm">
          <span className="text-slate-400">Try the demo:</span>
          <code className="text-green-400">demo@strategyos.ai</code>
          <span className="text-slate-600">·</span>
          <code className="text-green-400">Demo@1234</code>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-slate-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-4">The Problem</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Retail traders can't build institutional-grade strategies. The tools exist — but they're locked away from 99% of the market.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
              <span className="text-3xl mb-4 block">{p.icon}</span>
              <h3 className="text-white font-semibold text-lg mb-2">{p.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-800/30 border-y border-slate-800 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-4">From Strategy to Execution in 4 Steps</h2>
            <p className="text-slate-400">Every execution logged on-chain · Verifiable · Immutable · Transparent</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-600/50 to-transparent z-10" />
                )}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-900/40 px-2 py-1 rounded-md">{s.step}</span>
                    <span className="text-2xl">{s.icon}</span>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Built on SoSoValue API, SoDEX, and Arbitrum — the full DeFi stack, no code required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-slate-800/60 border border-slate-700 hover:border-indigo-600/50 rounded-2xl p-6 transition-colors group">
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Creator economy */}
      <section className="bg-gradient-to-br from-indigo-900/40 to-violet-900/20 border-y border-indigo-800/40 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Built-In Creator Economy</h2>
          <p className="text-slate-300 mb-12 text-lg">Every trade execution distributes 0.1 SOSO automatically via smart contract.</p>
          <div className="grid grid-cols-3 gap-6 mb-10">
            {[
              { pct: '70%', label: 'Strategy Creator', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700' },
              { pct: '20%', label: 'Module Creators', color: 'text-indigo-400', bg: 'bg-indigo-900/30 border-indigo-700' },
              { pct: '10%', label: 'Protocol Treasury', color: 'text-slate-300', bg: 'bg-slate-700/40 border-slate-600' },
            ].map((r) => (
              <div key={r.label} className={`rounded-2xl border p-6 ${r.bg}`}>
                <p className={`text-4xl font-bold mb-2 ${r.color}`}>{r.pct}</p>
                <p className="text-slate-400 text-sm">{r.label}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-sm">Distributed automatically via StrategyOS.sol on Arbitrum Sepolia · No manual claims needed</p>
        </div>
      </section>

      {/* Market opportunity */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">A $10B+ Addressable Market</h2>
            <div className="space-y-4">
              {[
                { tier: 'Tier 1 — Retail Traders', size: '10M+ active traders', value: '$100–500/yr on tools', color: 'border-green-600' },
                { tier: 'Tier 2 — Prop Firms', size: '5,000+ firms', value: '$100K–1M/yr on algo trading', color: 'border-indigo-600' },
                { tier: 'Tier 3 — Hedge Funds', size: '5,000+ funds', value: '$1M–10M/yr on infrastructure', color: 'border-violet-600' },
              ].map((t) => (
                <div key={t.tier} className={`border-l-2 ${t.color} pl-4`}>
                  <p className="text-white font-medium text-sm">{t.tier}</p>
                  <p className="text-slate-400 text-sm">{t.size} · {t.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h3 className="text-white font-semibold mb-6">Projected Revenue</h3>
            <div className="flex items-end gap-6 h-40">
              {[{ year: 'Year 1', val: 1, h: '10%' }, { year: 'Year 2', val: 8, h: '30%' }, { year: 'Year 3', val: 40, h: '100%' }].map((y) => (
                <div key={y.year} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-indigo-400 font-bold text-sm">${y.val}M</span>
                  <div className="w-full bg-indigo-600/80 rounded-t-lg" style={{ height: y.h }} />
                  <span className="text-slate-400 text-xs">{y.year}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pitch Deck CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-900/40 border border-red-700 rounded-xl flex items-center justify-center text-2xl">📄</div>
            <div>
              <h3 className="text-white font-semibold">StrategyOS Pitch Deck</h3>
              <p className="text-slate-400 text-sm">Full investor deck · 11 slides · SoSoValue Buildathon 2026</p>
            </div>
          </div>
          <a href="/StrategyOS_PitchDeck.pdf" target="_blank" rel="noreferrer" download
            className="bg-white hover:bg-slate-100 text-slate-900 font-semibold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap flex items-center gap-2">
            ⬇ Download PDF
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-800 py-24 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          The Figma of Trading Strategies.
        </h2>
        <p className="text-slate-400 mb-10 text-lg max-w-xl mx-auto">
          Where every trader builds like an institution. Help us democratize trading for the 10M retail traders who deserve it.
        </p>
        <Link to="/auth"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-all shadow-xl shadow-indigo-900/50">
          Start Building Free →
        </Link>
        <p className="text-slate-600 text-sm mt-4">
          Demo: demo@strategyos.ai · Demo@1234
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6 text-center text-slate-600 text-sm">
        <p>StrategyOS · Built for SoSoValue Buildathon 2026 · Powered by SoSoValue API · SoDEX · Arbitrum</p>
      </footer>
    </div>
  )
}

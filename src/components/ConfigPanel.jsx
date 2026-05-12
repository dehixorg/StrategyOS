export default function ConfigPanel({ node, onConfigChange }) {
  if (!node) {
    return (
      <div className="p-4 text-slate-500 text-sm text-center mt-10">
        Select a module to configure it
      </div>
    )
  }

  const cfg = node.data.config || {}

  const update = (key, value) => {
    onConfigChange(node.id, { ...cfg, [key]: value })
  }

  return (
    <div className="p-4">
      <h3 className="text-white font-semibold mb-4 text-sm">{node.data.type} Config</h3>

      {node.data.type === 'Sentiment' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Min Confidence: <span className="text-indigo-400 font-medium">{cfg.minConfidence ?? 60}</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={cfg.minConfidence ?? 60}
              onChange={(e) => update('minConfidence', Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span><span>100</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Asset Pair</label>
            <select
              value={cfg.pair || 'BTC/USD'}
              onChange={(e) => update('pair', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option>BTC/USD</option>
              <option>ETH/USD</option>
              <option>SOL/USD</option>
            </select>
          </div>
        </div>
      )}

      {node.data.type === 'RiskCheck' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Max Position Size (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={cfg.maxPosition ?? 10}
              onChange={(e) => update('maxPosition', Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Stop Loss (%)</label>
            <input
              type="number"
              min="0.5"
              max="50"
              step="0.5"
              value={cfg.stopLoss ?? 5}
              onChange={(e) => update('stopLoss', Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Take Profit (%)</label>
            <input
              type="number"
              min="0.5"
              max="100"
              step="0.5"
              value={cfg.takeProfit ?? 10}
              onChange={(e) => update('takeProfit', Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {node.data.type === 'Executor' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Exchange</label>
            <select
              value={cfg.exchange || 'SoDEX'}
              onChange={(e) => update('exchange', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option>SoDEX</option>
              <option>Uniswap</option>
              <option>dYdX</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Slippage Tolerance (%)</label>
            <input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={cfg.slippage ?? 0.5}
              onChange={(e) => update('slippage', Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Order Type</label>
            <select
              value={cfg.orderType || 'market'}
              onChange={(e) => update('orderType', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

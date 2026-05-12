import { Handle, Position } from 'reactflow'

const MODULE_STYLES = {
  Sentiment: { bg: 'bg-purple-900/60', border: 'border-purple-600', icon: '🧠', label: 'Sentiment' },
  RiskCheck: { bg: 'bg-amber-900/60', border: 'border-amber-600', icon: '🛡', label: 'Risk Check' },
  Executor: { bg: 'bg-green-900/60', border: 'border-green-600', icon: '⚡', label: 'Executor' },
}

export default function ModuleNode({ data, selected }) {
  const style = MODULE_STYLES[data.type] || MODULE_STYLES.Sentiment

  return (
    <div
      className={`
        ${style.bg} ${style.border}
        border-2 rounded-xl px-5 py-4 min-w-[160px] cursor-pointer
        shadow-lg transition-all
        ${selected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      {data.type !== 'Sentiment' && (
        <Handle type="target" position={Position.Left} />
      )}
      <div className="text-2xl mb-1">{style.icon}</div>
      <div className="text-white font-semibold text-sm">{style.label}</div>
      <div className="text-slate-400 text-xs mt-0.5">{data.label || data.type}</div>
      {data.type !== 'Executor' && (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  )
}

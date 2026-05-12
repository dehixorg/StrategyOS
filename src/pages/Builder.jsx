import { useState, useCallback, useRef, useEffect } from 'react'
import ReactFlow, {
  MiniMap, Controls, Background, addEdge,
  useNodesState, useEdgesState, BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useNavigate } from 'react-router-dom'
import ModuleNode from '../components/ModuleNode'
import ConfigPanel from '../components/ConfigPanel'
import api from '../lib/api'
import { toast } from '../lib/toast.jsx'

const nodeTypes = { moduleNode: ModuleNode }

const PALETTE_MODULES = [
  { type: 'Sentiment', label: 'Sentiment Analysis', icon: '🧠', desc: 'Live sentiment via SoSoValue API' },
  { type: 'RiskCheck', label: 'Risk Check',         icon: '🛡', desc: 'Position sizing & stop-loss' },
  { type: 'Executor',  label: 'Executor',            icon: '⚡', desc: 'EIP-712 orders on SoDEX' },
]

// Full pipeline template — one click sets up all 3 modules connected
const QUICK_TEMPLATE = {
  nodes: [
    { id: 'n1', type: 'moduleNode', position: { x: 80,  y: 160 }, data: { type: 'Sentiment', label: 'Sentiment', config: { pair: 'BTC/USD', minConfidence: 60 } } },
    { id: 'n2', type: 'moduleNode', position: { x: 330, y: 160 }, data: { type: 'RiskCheck',  label: 'Risk Check', config: { maxPosition: 10, stopLoss: 5, takeProfit: 10 } } },
    { id: 'n3', type: 'moduleNode', position: { x: 580, y: 160 }, data: { type: 'Executor',   label: 'Executor',   config: { exchange: 'SoDEX', slippage: 0.5, orderType: 'market' } } },
  ],
  edges: [
    { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#6366f1' } },
    { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#6366f1' } },
  ],
}

let idCounter = 10  // start above template IDs

export default function Builder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [strategyName, setStrategyName] = useState('My Strategy')
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const navigate = useNavigate()

  // Auto-add module if redirected from Marketplace
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingModule')
    if (!pending) return
    sessionStorage.removeItem('pendingModule')
    try {
      const mod = JSON.parse(pending)
      const newNode = {
        id: `node-${idCounter++}`,
        type: 'moduleNode',
        position: { x: 200 + Math.random() * 100, y: 150 + Math.random() * 80 },
        data: { type: mod.type, label: mod.name || mod.type, config: {} },
      }
      setNodes((nds) => nds.concat(newNode))
      toast.info(`${mod.name} added to canvas.`)
    } catch { /* pass */ }
  }, [setNodes])

  const applyTemplate = () => {
    setNodes(QUICK_TEMPLATE.nodes)
    setEdges(QUICK_TEMPLATE.edges)
    setStrategyName('BTC Sentiment Strategy')
    toast.success('Pipeline template applied — configure and save!')
  }

  const clearCanvas = () => {
    setNodes([])
    setEdges([])
    setSelectedNode(null)
    setSavedId(null)
  }

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1' } }, eds)),
    [setEdges]
  )

  const onNodeClick  = useCallback((_, node) => setSelectedNode(node), [])
  const onPaneClick  = useCallback(() => setSelectedNode(null), [])

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }, [])

  const onDrop = useCallback((event) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/moduleType')
    if (!type || !reactFlowInstance) return
    const bounds = reactFlowWrapper.current.getBoundingClientRect()
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    })
    setNodes((nds) => nds.concat({
      id: `node-${idCounter++}`,
      type: 'moduleNode',
      position,
      data: { type, label: type, config: {} },
    }))
  }, [reactFlowInstance, setNodes])

  const onConfigChange = useCallback((nodeId, newConfig) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, config: newConfig } } : n))
    setSelectedNode((prev) => prev?.id === nodeId ? { ...prev, data: { ...prev.data, config: newConfig } } : prev)
  }, [setNodes])

  const handleSave = async () => {
    if (nodes.length === 0) { toast.error('Add at least one module before saving.'); return }
    setSaving(true)
    try {
      const wallet = localStorage.getItem('walletAddress') || undefined
      const payload = {
        name: strategyName,
        modules:     nodes.map((n) => ({ id: n.id, type: n.data.type, config: n.data.config || {} })),
        connections: edges.map((e) => ({ from: e.source, to: e.target })),
        creatorWallet: wallet,
      }
      const { data } = await api.post('/strategy/create', payload)
      setSavedId(data.strategyId)
      toast.success(`Strategy "${strategyName}" saved! Registering on ValueChain...`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save strategy.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">

      {/* Left: palette */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">Module Palette</h2>
          <p className="text-xs text-slate-400 mt-0.5">Drag onto canvas</p>
        </div>
        <div className="p-3 space-y-2">
          {PALETTE_MODULES.map((m) => (
            <div
              key={m.type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('application/moduleType', m.type)}
              className="bg-slate-900 border border-slate-600 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-colors select-none"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{m.icon}</span>
                <span className="text-white text-sm font-medium">{m.label}</span>
              </div>
              <p className="text-xs text-slate-400">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick-build template */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={applyTemplate}
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium py-2 rounded-lg transition-colors mb-2"
          >
            ⚡ Quick Build Template
          </button>
          <button
            onClick={clearCanvas}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs py-1.5 rounded-lg transition-colors"
          >
            Clear Canvas
          </button>
        </div>

        <div className="p-3 mt-auto border-t border-slate-700">
          <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300 mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Drag modules onto canvas</li>
              <li>Connect with arrows</li>
              <li>Click to configure</li>
              <li>Save & deploy</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Center: canvas */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-700 bg-slate-800 flex-wrap">
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            placeholder="Strategy name"
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500 w-44"
          />
          <div className="flex-1" />
          {savedId && (
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-xs">✓ Saved</span>
              <button onClick={() => navigate(`/strategy/${savedId}`)} className="text-xs text-indigo-400 hover:text-indigo-300">
                View →
              </button>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : '💾 Save & Deploy'}
          </button>
        </div>

        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onNodeClick={onNodeClick}
            onPaneClick={onPaneClick} onDrop={onDrop}
            onDragOver={onDragOver} onInit={setReactFlowInstance}
            nodeTypes={nodeTypes} fitView
            style={{ background: '#0f172a' }}
          >
            <MiniMap
              nodeColor={(n) => n.data?.type === 'Sentiment' ? '#7c3aed' : n.data?.type === 'RiskCheck' ? '#d97706' : '#059669'}
              style={{ background: '#1e293b' }}
            />
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-slate-600 text-lg mb-2">Canvas is empty</p>
                <p className="text-slate-700 text-sm">Drag modules from the left, or click <span className="text-indigo-500">⚡ Quick Build Template</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: config */}
      <div className="w-64 bg-slate-800 border-l border-slate-700 overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">Configuration</h2>
        </div>
        <ConfigPanel node={selectedNode} onConfigChange={onConfigChange} />
      </div>
    </div>
  )
}

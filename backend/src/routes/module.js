const express = require('express')
const Module = require('../models/Module')
const auth = require('../middleware/auth')

const router = express.Router()

const MODULES = [
  {
    id: 'm1', name: 'SoSoValue Sentiment', category: 'Sentiment', type: 'Sentiment',
    creator: 'SoSoValue Labs', rating: 4.8, usageCount: 1240, price: 0,
    description: 'Real-time market sentiment analysis using SoSoValue\'s proprietary NLP engine.',
    tags: ['sentiment', 'NLP', 'real-time'],
    configSchema: { minConfidence: { type: 'number', min: 0, max: 100, default: 60 }, pair: { type: 'select', options: ['BTC/USD', 'ETH/USD', 'SOL/USD'] } },
  },
  {
    id: 'm2', name: 'Advanced Risk Manager', category: 'Risk', type: 'RiskCheck',
    creator: 'DeFi Guard', rating: 4.6, usageCount: 870, price: 0.5,
    description: 'Comprehensive risk management with dynamic position sizing, stop-loss, and take-profit.',
    tags: ['risk', 'portfolio', 'stop-loss'],
    configSchema: { maxPosition: { type: 'number', min: 1, max: 100, default: 10 }, stopLoss: { type: 'number', default: 5 }, takeProfit: { type: 'number', default: 10 } },
  },
  {
    id: 'm3', name: 'SoDEX Executor', category: 'Execution', type: 'Executor',
    creator: 'SoDEX Team', rating: 4.9, usageCount: 2100, price: 0,
    description: 'Execute orders on SoDEX with optimal routing and MEV resistance.',
    tags: ['execution', 'DEX', 'MEV'],
    configSchema: { exchange: { type: 'select', options: ['SoDEX', 'Uniswap', 'dYdX'] }, slippage: { type: 'number', default: 0.5 } },
  },
  {
    id: 'm4', name: 'Volatility Filter', category: 'Risk', type: 'RiskCheck',
    creator: 'AlgoTrader Pro', rating: 4.3, usageCount: 430, price: 1.0,
    description: 'Filters trades during high-volatility periods using ATR and Bollinger Band indicators.',
    tags: ['volatility', 'ATR', 'filter'],
    configSchema: { maxPosition: { type: 'number', default: 5 }, stopLoss: { type: 'number', default: 3 }, takeProfit: { type: 'number', default: 8 } },
  },
  {
    id: 'm5', name: 'Multi-Exchange Executor', category: 'Execution', type: 'Executor',
    creator: 'CrossChain Labs', rating: 4.5, usageCount: 650, price: 2.0,
    description: 'Route orders across Uniswap, SoDEX, and dYdX for best price execution.',
    tags: ['execution', 'multi-exchange', 'routing'],
    configSchema: { exchange: { type: 'select', options: ['SoDEX', 'Uniswap', 'dYdX'] }, slippage: { type: 'number', default: 1.0 } },
  },
  {
    id: 'm6', name: 'On-Chain Sentiment', category: 'Sentiment', type: 'Sentiment',
    creator: 'Nansen AI', rating: 4.7, usageCount: 780, price: 1.5,
    description: 'Uses on-chain data (whale movements, exchange flows) to gauge sentiment.',
    tags: ['on-chain', 'whale', 'data'],
    configSchema: { minConfidence: { type: 'number', default: 70 }, pair: { type: 'select', options: ['BTC/USD', 'ETH/USD'] } },
  },
]

// POST /module/publish — authenticated, saves to DB
router.post('/publish', auth, async (req, res) => {
  try {
    const { name, category, type, description, tags, price, creatorWallet } = req.body
    if (!name || !description) return res.status(400).json({ message: 'Name and description required' })

    const mod = await Module.create({
      name, category, type,
      description, tags: tags || [],
      price: parseFloat(price) || 0,
      creatorId: req.userId,
      creatorWallet: creatorWallet || '',
      rating: 5.0,
      usageCount: 0,
    })
    res.status(201).json({ success: true, module: mod })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/browse', async (req, res) => {
  // Merge hardcoded + user-published modules
  let dbModules = []
  try { dbModules = await Module.find().sort({ rating: -1 }).lean() } catch { /* pass */ }
  const all = [...MODULES, ...dbModules.map((m) => ({ ...m, id: m._id }))]
  const { category, sortBy } = req.query
  let modules = category ? all.filter((m) => m.category.toLowerCase() === category.toLowerCase()) : all
  if (sortBy === 'usage') modules.sort((a, b) => b.usageCount - a.usageCount)
  else if (sortBy === 'price') modules.sort((a, b) => a.price - b.price)
  else modules.sort((a, b) => b.rating - a.rating)
  return res.json({ modules })
})

module.exports = router

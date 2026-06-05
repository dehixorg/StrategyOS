require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Strategy = require('./models/Strategy')
const Execution = require('./models/Execution')

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  await Strategy.deleteMany({})
  await Execution.deleteMany({})
  await User.deleteMany({})

  const guestUser = await User.create({
    email: 'judge@sosovalue.com',
    password: 'judge123',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678'
  })

  const managerId = guestUser._id

  const strategy = await Strategy.create({
    name: 'SoSoValue AI Sentiment Alpha',
    description: 'This strategy aggregates SoSoValue news volume, ETF fund flows, and sector spotlight performance to dynamically weight a sentiment score. It executes high-probability trades on SoDEX only when the aggregate confidence threshold exceeds 80%.',
    creatorId: managerId,
    riskLevel: 'Moderate',
    status: 'active',
    config: {
      modules: [
        {
          id: 'mod-1',
          type: 'Sentiment',
          name: 'SoSoValue Alpha Generator',
          config: { pair: 'BTC/USD', minConfidence: 80 }
        },
        {
          id: 'mod-2',
          type: 'RiskCheck',
          name: 'Dynamic Position Sizing',
          config: { maxPosition: 15, stopLoss: 4, takeProfit: 8 }
        },
        {
          id: 'mod-3',
          type: 'Executor',
          name: 'SoDEX EIP-712 Router',
          config: { exchange: 'SoDEX', slippage: 0.5, orderType: 'market' }
        }
      ]
    },
    stats: {
      totalTrades: 142,
      totalPnL: 8450.50,
      winRate: 0.68,
      sharpeRatio: 2.1
    },
    earnings: {
      totalSOSO: 42.6,
      pendingSOSO: 14.2
    },
    usageCount: 45
  })

  // Create some recent execution logs
  const now = Date.now()
  const logs = []
  for (let i = 0; i < 20; i++) {
    const isWin = Math.random() > 0.3
    const pnl = isWin ? Math.random() * 100 : -(Math.random() * 40)
    logs.push({
      strategyId: strategy._id,
      timestamp: new Date(now - i * 5 * 60 * 1000), // every 5 minutes
      moduleOutputs: {
        sentiment: {
          score: Math.floor(Math.random() * 50) + 50,
          confidence: 0.8 + Math.random() * 0.15,
          pass: true
        },
        risk: {
          pass: true,
          maxSize: 1500,
          stopLoss: 60000,
          takeProfit: 65000
        },
        executor: {
          action: 'BUY',
          size: 1500,
          reason: 'Passed'
        }
      },
      tradePlaced: true,
      tradeId: 'sodex-trade-' + Math.floor(Math.random() * 10000),
      pnl: parseFloat(pnl.toFixed(2)),
      status: 'success',
      onChainTxHash: '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0')
    })
  }

  await Execution.insertMany(logs)

  console.log('Successfully seeded database with SoSoValue AI Sentiment Alpha strategy and 20 execution logs.')
  process.exit(0)
}

seed().catch(console.error)

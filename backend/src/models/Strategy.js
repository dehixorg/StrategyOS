const mongoose = require('mongoose')

const moduleSchema = new mongoose.Schema({
  id: String,
  type: { type: String, enum: ['Sentiment', 'RiskCheck', 'Executor'] },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false })

const connectionSchema = new mongoose.Schema({
  from: String,
  to: String,
}, { _id: false })

const strategySchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  config: {
    modules: [moduleSchema],
    connections: [connectionSchema],
  },
  status: { type: String, enum: ['draft', 'active', 'paused'], default: 'draft' },
  onChainId: { type: String, default: null },
  onChainTxHash: { type: String, default: null },
  stats: {
    totalTrades: { type: Number, default: 0 },
    totalPnL: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    sharpeRatio: { type: Number, default: 0 },
    peakPnL: { type: Number, default: 0 },
    currentDrawdown: { type: Number, default: 0 },
    maxDrawdownThreshold: { type: Number, default: 20 }, // Pause strategy if drawdown > 20%
  },
  earnings: {
    totalSOSO: { type: Number, default: 0 },
    pendingSOSO: { type: Number, default: 0 },
    claimedSOSO: { type: Number, default: 0 },
  },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('Strategy', strategySchema)

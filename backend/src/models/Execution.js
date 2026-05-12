const mongoose = require('mongoose')

const executionSchema = new mongoose.Schema({
  strategyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Strategy', required: true },
  timestamp: { type: Date, default: Date.now },
  moduleOutputs: {
    sentiment: {
      score: Number,
      confidence: Number,
      pass: Boolean,
    },
    risk: {
      pass: Boolean,
      maxSize: Number,
      stopLoss: Number,
      takeProfit: Number,
    },
    executor: {
      action: String,
      size: Number,
      reason: String,
    },
  },
  tradePlaced: { type: Boolean, default: false },
  tradeId: { type: String, default: null },
  pnl: { type: Number, default: null },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  onChainTxHash: { type: String, default: null },
  error: { type: String, default: null },
}, { timestamps: true })

module.exports = mongoose.model('Execution', executionSchema)

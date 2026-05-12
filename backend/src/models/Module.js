const mongoose = require('mongoose')

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Sentiment', 'RiskCheck', 'Executor'], required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorWallet: { type: String, default: null },
  rating: { type: Number, default: 5.0 },
  usageCount: { type: Number, default: 0 },
  price: { type: Number, default: 0 },   // USDC/month
  tags: [{ type: String }],
  configSchema: { type: mongoose.Schema.Types.Mixed, default: {} },
  isPublic: { type: Boolean, default: true },
  earnings: {
    totalSOSO: { type: Number, default: 0 },
    pendingSOSO: { type: Number, default: 0 },
    claimedSOSO: { type: Number, default: 0 },
  },
}, { timestamps: true })

module.exports = mongoose.model('Module', moduleSchema)

const express = require('express')
const Strategy = require('../models/Strategy')
const User = require('../models/User')
const auth = require('../middleware/auth')
const { registerStrategy } = require('../services/contract')

const router = express.Router()

// Default module creator wallet (protocol treasury) when no individual wallet is set
const PROTOCOL_WALLET = process.env.TREASURY_WALLET || process.env.DEPLOYER_PRIVATE_KEY
  ? (process.env.TREASURY_WALLET || '0x0000000000000000000000000000000000000001')
  : '0x0000000000000000000000000000000000000001'

router.post('/create', auth, async (req, res) => {
  try {
    const { name, modules, connections, creatorWallet } = req.body
    if (!name) return res.status(400).json({ message: 'Strategy name required' })

    const strategy = await Strategy.create({
      creatorId: req.userId,
      name,
      config: { modules: modules || [], connections: connections || [] },
    })

    // Optionally update user's wallet if provided
    if (creatorWallet) {
      await User.findByIdAndUpdate(req.userId, { walletAddress: creatorWallet })
    }

    // Register on ValueChain in the background (non-blocking)
    // moduleCreators: use PROTOCOL_WALLET for built-in modules (they earn treasury share)
    const moduleCreators = (modules || []).map(() => PROTOCOL_WALLET)

    registerStrategy(strategy._id.toString(), moduleCreators)
      .then((txHash) => {
        if (txHash) {
          Strategy.findByIdAndUpdate(strategy._id, {
            onChainId: strategy._id.toString(),
            onChainTxHash: txHash,
          }).catch(() => {})
        }
      })
      .catch(() => {})

    res.status(201).json({
      success: true,
      strategyId: strategy._id,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/my-strategies', auth, async (req, res) => {
  try {
    const strategies = await Strategy.find({ creatorId: req.userId }).sort({ createdAt: -1 })
    res.json({ strategies })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Public marketplace listing — top strategies by usage
router.get('/marketplace/top', async (req, res) => {
  try {
    const strategies = await Strategy.find({ status: 'active' })
      .sort({ usageCount: -1 })
      .limit(20)
      .select('name stats usageCount createdAt')
    res.json({ strategies })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const strategy = await Strategy.findOne({ _id: req.params.id, creatorId: req.userId })
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })
    res.json({ strategy })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, modules, connections } = req.body
    const strategy = await Strategy.findOneAndUpdate(
      { _id: req.params.id, creatorId: req.userId },
      { name, 'config.modules': modules, 'config.connections': connections },
      { new: true }
    )
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

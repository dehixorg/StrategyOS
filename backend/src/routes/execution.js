const express = require('express')
const Strategy = require('../models/Strategy')
const Execution = require('../models/Execution')
const auth = require('../middleware/auth')
const { executeStrategy } = require('../services/strategyEngine')

const router = express.Router()

router.post('/activate', auth, async (req, res) => {
  try {
    const { strategyId } = req.body
    const strategy = await Strategy.findOne({ _id: strategyId, creatorId: req.userId })
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })

    strategy.status = 'active'
    await strategy.save()

    const nextExecution = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    res.json({ success: true, nextExecution })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/pause', auth, async (req, res) => {
  try {
    const { strategyId } = req.body
    const strategy = await Strategy.findOne({ _id: strategyId, creatorId: req.userId })
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })

    strategy.status = 'paused'
    await strategy.save()

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.get('/status/:strategyId', auth, async (req, res) => {
  try {
    const strategy = await Strategy.findOne({
      _id: req.params.strategyId,
      creatorId: req.userId,
    })
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })

    const recentExecutions = await Execution.find({ strategyId: req.params.strategyId })
      .sort({ timestamp: -1 })
      .limit(50)

    res.json({ status: strategy.status, recentExecutions })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Manual trigger for testing
router.post('/execute', auth, async (req, res) => {
  try {
    const { strategyId, network } = req.body
    const strategy = await Strategy.findOne({ _id: strategyId, creatorId: req.userId })
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })

    const wasActive = strategy.status === 'active'
    if (!wasActive) {
      strategy.status = 'active'
      await strategy.save()
    }

    const result = await executeStrategy(strategyId, network)

    if (!wasActive) {
      await Strategy.findByIdAndUpdate(strategyId, { status: 'paused' })
    }

    res.json({ success: true, result })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

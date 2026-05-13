const express = require('express')
const auth = require('../middleware/auth')
const { generateStrategy, analyzeStrategy } = require('../services/openai')
const Strategy = require('../models/Strategy')
const Execution = require('../models/Execution')

const router = express.Router()

// POST /ai/generate-strategy  { prompt }
router.post('/generate-strategy', auth, async (req, res) => {
  const { prompt } = req.body
  if (!prompt?.trim()) return res.status(400).json({ message: 'Prompt is required' })
  try {
    const result = await generateStrategy(prompt)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[AI] generate error:', err.message)
    res.status(500).json({ message: 'AI generation failed: ' + err.message })
  }
})

// GET /ai/analyze/:strategyId
router.get('/analyze/:strategyId', auth, async (req, res) => {
  try {
    const strategy = await Strategy.findOne({ _id: req.params.strategyId, creatorId: req.userId })
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })

    const executions = await Execution.find({ strategyId: req.params.strategyId })
      .sort({ timestamp: -1 }).limit(20)

    const insight = await analyzeStrategy(strategy.name, strategy.stats || {}, executions)
    res.json({ success: true, insight })
  } catch (err) {
    console.error('[AI] analyze error:', err.message)
    res.status(500).json({ message: 'AI analysis failed: ' + err.message })
  }
})

module.exports = router

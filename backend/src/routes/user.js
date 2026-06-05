const express = require('express')
const auth = require('../middleware/auth')
const User = require('../models/User')

const router = express.Router()

// GET /user/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// POST /user/deposit
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' })

    const user = await User.findByIdAndUpdate(req.userId, {
      $inc: { portfolioBalance: amount }
    }, { new: true }).select('-password')

    res.json({ success: true, balance: user.portfolioBalance })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

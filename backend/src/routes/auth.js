const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'Email already registered' })

    const user = await User.create({ email, password })
    const token = signToken(user._id)
    res.status(201).json({ success: true, token, userId: user._id })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const valid = await user.comparePassword(password)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })

    const token = signToken(user._id)
    res.json({ success: true, token, userId: user._id })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

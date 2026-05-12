/**
 * Public market data routes — no auth required.
 * Powers the live sentiment ticker widget on the frontend dashboard.
 */
const express = require('express')
const { getSentiment, getMarketData, getEtfFlows, getSectorSpotlight, getNews } = require('../services/sosovalue')

const router = express.Router()

// In-memory cache: 60s TTL to stay within rate limits
const cache = new Map()
function cached(key, ttlMs, fn) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < ttlMs) return Promise.resolve(entry.value)
  return fn().then((v) => { cache.set(key, { value: v, ts: Date.now() }); return v })
}

// GET /market/sentiment?pair=BTC/USD
router.get('/sentiment', async (req, res) => {
  const pair = req.query.pair || 'BTC/USD'
  try {
    const data = await cached(`sentiment:${pair}`, 60_000, () => getSentiment(pair))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /market/price?pair=BTC/USD
router.get('/price', async (req, res) => {
  const pair = req.query.pair || 'BTC/USD'
  try {
    const data = await cached(`price:${pair}`, 30_000, () => getMarketData(pair))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /market/etf-flows?symbol=BTC
router.get('/etf-flows', async (req, res) => {
  const symbol = req.query.symbol || 'BTC'
  try {
    const data = await cached(`etf:${symbol}`, 300_000, () => getEtfFlows(symbol, 'US', 7))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /market/sectors
router.get('/sectors', async (req, res) => {
  try {
    const data = await cached('sectors', 120_000, getSectorSpotlight)
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// GET /market/news?pair=BTC/USD
router.get('/news', async (req, res) => {
  const pair       = req.query.pair || 'BTC/USD'
  const ids        = { 'BTC/USD': 'bitcoin', 'ETH/USD': 'ethereum', 'SOL/USD': 'solana' }
  const currencyId = ids[pair] || 'bitcoin'
  try {
    const data = await cached(`news:${currencyId}`, 120_000, () => getNews(currencyId, 5))
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

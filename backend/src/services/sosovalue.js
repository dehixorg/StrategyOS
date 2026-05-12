/**
 * SoSoValue API integration
 * Base URL : https://openapi.sosovalue.com/openapi/v1
 * Auth     : x-soso-api-key header
 * Rate     : 20 req/min, 100k/month
 * Response : { code: 0, message: "success", data: <payload> }
 */
const axios = require('axios')

const BASE_URL = 'https://openapi.sosovalue.com/openapi/v1'

// Numeric currency IDs from GET /currencies (names are invalid)
const CURRENCY_IDS = {
  'BTC/USD':  '1673723677362319866',
  'BTC/USDC': '1673723677362319866',
  'ETH/USD':  '1673723677362319867',
  'ETH/USDC': '1673723677362319867',
  'SOL/USD':  '1673723677362319875',
  'SOL/USDC': '1673723677362319875',
}

// Symbolic keys used for ETF lookups (keyed by currency_id)
const CURRENCY_SYMBOL = {
  '1673723677362319866': 'bitcoin',
  '1673723677362319867': 'ethereum',
  '1673723677362319875': 'solana',
}

// ETF tickers for BTC/ETH on SoSoValue (US market)
const ETF_TICKERS = {
  bitcoin:  { symbol: 'BTC', country_code: 'US' },
  ethereum: { symbol: 'ETH', country_code: 'US' },
}

function client() {
  const key = process.env.SOSOVALUE_API_KEY
  if (!key || key.startsWith('your_')) return null
  return axios.create({
    baseURL: BASE_URL,
    headers: { 'x-soso-api-key': key },
    timeout: 8000,
  })
}

// Unwrap the standard { code, message, data } envelope
function unwrap(res) {
  if (res.data?.code !== 0 && res.data?.code !== undefined) {
    throw new Error(`SoSoValue API error ${res.data.code}: ${res.data.message}`)
  }
  return res.data?.data ?? res.data
}

/**
 * Compute sentiment score (-100 to +100) and confidence (0-1) from 4 signals:
 *   1. Price momentum     (weight 0.40) — 24h change_pct from market-snapshot
 *   2. ETF net flow       (weight 0.30) — BTC/ETH ETF inflows (institutional signal)
 *   3. News volume        (weight 0.20) — hot news count as attention proxy
 *   4. Sector performance (weight 0.10) — avg sector 24h change from sector-spotlight
 */
async function getSentiment(pair = 'BTC/USD') {
  const http = client()
  if (!http) return mockSentiment(pair)

  const currencyId = CURRENCY_IDS[pair] || '1673723677362319866'
  const symbol     = CURRENCY_SYMBOL[currencyId] || 'bitcoin'
  const etfInfo    = ETF_TICKERS[symbol]

  const [snapshotRes, etfRes, hotNewsRes, sectorRes] = await Promise.allSettled([
    http.get(`/currencies/${currencyId}/market-snapshot`),
    etfInfo
      ? http.get(`/etfs/summary-history`, {
          params: {
            symbol:       etfInfo.symbol,
            country_code: etfInfo.country_code,
            limit:        1,
          },
        })
      : Promise.reject(new Error('no etf')),
    http.get('/news/hot', { params: { page: 1, page_size: 50, language: 'en' } }),
    http.get('/currencies/sector-spotlight'),
  ])

  // ── Signal 1: Price momentum ──────────────────────────────────────────────
  // change_pct_24h is a decimal fraction (0.05 = 5%), so multiply by 2000 for ±100 at ±5%
  let momentumScore = 0
  let priceDataOk   = false
  if (snapshotRes.status === 'fulfilled') {
    const snap   = unwrap(snapshotRes.value)
    const change = parseFloat(snap.change_pct_24h || 0)
    momentumScore = Math.max(-100, Math.min(100, change * 2000))
    priceDataOk   = true
  }

  // ── Signal 2: ETF flows ───────────────────────────────────────────────────
  let etfScore = 0
  if (etfRes.status === 'fulfilled') {
    const rows      = unwrap(etfRes.value)
    const latest    = Array.isArray(rows) ? rows[0] : null
    const netInflow = parseFloat(latest?.total_net_inflow || 0)   // USD
    // Clamp: ±$500M → ±50 score points
    etfScore = Math.max(-50, Math.min(50, (netInflow / 1e7)))
  }

  // ── Signal 3: News volume ─────────────────────────────────────────────────
  let newsScore      = 0
  let newsConfidence = 0.5
  if (hotNewsRes.status === 'fulfilled') {
    const payload = unwrap(hotNewsRes.value)
    const articles = Array.isArray(payload) ? payload : (payload?.list || [])
    const count    = articles.length
    newsConfidence = Math.min(1, 0.4 + count * 0.012)
    newsScore      = count > 30 ? 20 : count > 15 ? 8 : count > 5 ? 0 : -10
  }

  // ── Signal 4: Sector performance ─────────────────────────────────────────
  // change_pct_24h is decimal fraction (0.007 = 0.7%), multiply by 600 for ±30 at ±5% avg
  let sectorScore = 0
  if (sectorRes.status === 'fulfilled') {
    const payload = unwrap(sectorRes.value)
    const sectors = Array.isArray(payload)
      ? payload
      : (payload?.sector || payload?.spotlight || [])
    if (sectors.length > 0) {
      const avg = sectors.reduce(
        (s, sec) => s + parseFloat(sec.change_pct_24h || sec['24h_change_pct'] || 0), 0
      ) / sectors.length
      sectorScore = Math.max(-30, Math.min(30, avg * 600))
    }
  }

  // ── Weighted composite ────────────────────────────────────────────────────
  const rawScore = momentumScore * 0.40 + etfScore * 0.30 + newsScore * 0.20 + sectorScore * 0.10
  const score    = Math.round(Math.max(-100, Math.min(100, rawScore)))
  const confidence = Math.min(1, Math.max(0.3, newsConfidence + (priceDataOk ? 0.1 : 0)))

  return { score, confidence, pair, source: 'sosovalue' }
}

/**
 * Live price + market data from market-snapshot.
 */
async function getMarketData(pair = 'BTC/USD') {
  const http = client()
  if (!http) return mockMarketData(pair)

  const currencyId = CURRENCY_IDS[pair] || '1673723677362319866'
  try {
    const res  = await http.get(`/currencies/${currencyId}/market-snapshot`)
    const snap = unwrap(res)
    return {
      pair,
      price:      parseFloat(snap.price || 0),
      volume24h:  parseFloat(snap.turnover_24h || 0),
      change24h:  parseFloat(snap.change_pct_24h || 0),
      marketcap:  parseFloat(snap.marketcap || 0),
      ath:        parseFloat(snap.ath || 0),
      rank:       snap.marketcap_rank,
      source:     'sosovalue',
    }
  } catch (err) {
    console.warn('[SoSoValue] getMarketData error:', err.message)
    return mockMarketData(pair)
  }
}

/**
 * Historical OHLCV klines (daily only).
 */
async function getKlines(pair = 'BTC/USD', limit = 30) {
  const http = client()
  if (!http) return []

  const currencyId = CURRENCY_IDS[pair] || '1673723677362319866'
  try {
    const end   = Date.now()
    const start = end - limit * 24 * 60 * 60 * 1000
    const res   = await http.get(`/currencies/${currencyId}/klines`, {
      params: { interval: '1d', start_time: start, end_time: end, limit },
    })
    return unwrap(res) || []
  } catch (err) {
    console.warn('[SoSoValue] getKlines error:', err.message)
    return []
  }
}

/**
 * Latest news (filtered by currency).
 */
async function getNews(currencyId = 'bitcoin', pageSize = 10) {
  const http = client()
  if (!http) return []

  try {
    const res     = await http.get('/news', {
      params: { currency_id: currencyId, page: 1, page_size: pageSize, language: 'en', category: 1 },
    })
    const payload = unwrap(res)
    return Array.isArray(payload) ? payload : (payload?.list || [])
  } catch {
    return []
  }
}

/**
 * ETF summary history for BTC or ETH.
 */
async function getEtfFlows(symbol = 'BTC', countryCode = 'US', limit = 7) {
  const http = client()
  if (!http) return []

  try {
    const res = await http.get('/etfs/summary-history', {
      params: { symbol, country_code: countryCode, limit },
    })
    return unwrap(res) || []
  } catch {
    return []
  }
}

/**
 * Sector spotlight — market-wide sentiment snapshot.
 */
async function getSectorSpotlight() {
  const http = client()
  if (!http) return []

  try {
    const res     = await http.get('/currencies/sector-spotlight')
    const payload = unwrap(res)
    return Array.isArray(payload) ? payload : (payload?.sector || [])
  } catch {
    return []
  }
}

// ── Mock fallbacks ────────────────────────────────────────────────────────────

function mockSentiment(pair) {
  const score = Math.round((Math.random() - 0.35) * 120)
  return {
    score:      Math.max(-100, Math.min(100, score)),
    confidence: Math.random() * 0.35 + 0.55,
    pair,
    source:     'mock',
  }
}

function mockMarketData(pair) {
  const prices = { 'BTC/USD': 67000, 'BTC/USDC': 67000, 'ETH/USD': 3500, 'ETH/USDC': 3500, 'SOL/USD': 185, 'SOL/USDC': 185 }
  const base   = prices[pair] || 50000
  return {
    pair,
    price:      base * (1 + (Math.random() - 0.5) * 0.02),
    volume24h:  Math.random() * 1e9,
    change24h:  (Math.random() - 0.5) * 5,
    marketcap:  base * 19e6,
    source:     'mock',
  }
}

module.exports = { getSentiment, getMarketData, getKlines, getNews, getEtfFlows, getSectorSpotlight }

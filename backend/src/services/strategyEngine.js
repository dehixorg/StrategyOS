const { getSentiment, getMarketData } = require('./sosovalue')
const { submitOrder, getMarketPrice } = require('./sodex')
const { logExecution: logToChain } = require('./contract')
const Strategy = require('../models/Strategy')
const Execution = require('../models/Execution')

// Execution fee in SOSO (mirrored from contract, tracked off-chain too)
const EXECUTION_FEE_SOSO = 0.1  // 0.1 SOSO
const CREATOR_SHARE = 0.70
const MODULE_SHARE  = 0.20
const TREASURY_SHARE = 0.10

async function runSentimentModule(config) {
  const pair = config.pair || 'BTC/USD'
  const minConfidence = config.minConfidence ?? 60

  const data = await getSentiment(pair)

  // Pass if: score is positive AND confidence meets threshold
  const pass = data.score > 0 && (data.confidence * 100) >= minConfidence

  return {
    score: data.score,
    confidence: data.confidence,
    pair,
    pass,
    source: data.source,
  }
}

async function runRiskModule(sentimentOutput, config, portfolioBalance = 10000) {
  if (!sentimentOutput.pass) {
    return { pass: false, maxSize: 0, stopLoss: 0, takeProfit: 0, currentPrice: 0, reason: 'Sentiment failed' }
  }

  const maxPositionPct = config.maxPosition ?? 10
  const stopLossPct    = config.stopLoss ?? 5
  const takeProfitPct  = config.takeProfit ?? 10

  // Use live price from SoDEX ticker, fall back to SoSoValue
  let price
  try {
    price = await getMarketPrice(sentimentOutput.pair)
  } catch {
    const md = await getMarketData(sentimentOutput.pair)
    price = md.price
  }

  const maxSize = portfolioBalance * (maxPositionPct / 100)

  return {
    pass: true,
    maxSize,
    stopLoss: price * (1 - stopLossPct / 100),
    takeProfit: price * (1 + takeProfitPct / 100),
    currentPrice: price,
    reason: 'Passed',
  }
}

async function runExecutorModule(riskOutput, config) {
  if (!riskOutput.pass) {
    return { action: 'HOLD', size: 0, reason: riskOutput.reason || 'Risk check failed' }
  }
  return {
    action: 'BUY',
    size: riskOutput.maxSize,
    exchange: config.exchange || 'SoDEX',
    slippage: config.slippage || 0.5,
    orderType: config.orderType || 'market',
  }
}

/**
 * Distribute off-chain royalty bookkeeping when contract is not configured.
 * This keeps creator/module earnings tracked in MongoDB.
 */
async function distributeRoyaltiesOffChain(strategy, modules) {
  const fee = EXECUTION_FEE_SOSO
  const creatorShare = fee * CREATOR_SHARE
  const moduleShare  = fee * MODULE_SHARE

  await Strategy.findByIdAndUpdate(strategy._id, {
    $inc: {
      'earnings.totalSOSO': creatorShare,
      'earnings.pendingSOSO': creatorShare,
    },
  })

  // Track per-module creator earnings (future: lookup module creator wallets)
  const perModule = modules.length > 0 ? moduleShare / modules.length : 0
  if (perModule > 0) {
    // If modules have DB references, update their earnings here
    // For wave 1 this is tracked in the execution record
    return { creatorShare, perModuleShare: perModule, total: fee }
  }
  return { creatorShare, perModuleShare: 0, total: fee }
}

async function executeStrategy(strategyId) {
  const strategy = await Strategy.findById(strategyId)
  if (!strategy || strategy.status !== 'active') {
    return { skipped: true, reason: 'Strategy not active' }
  }

  const modules     = strategy.config.modules || []
  const sentimentMod = modules.find((m) => m.type === 'Sentiment')
  const riskMod      = modules.find((m) => m.type === 'RiskCheck')
  const executorMod  = modules.find((m) => m.type === 'Executor')

  const User = require('../models/User') // inline require to avoid circular deps if any
  const creator = await User.findById(strategy.creatorId).select('portfolioBalance')
  const portfolioBalance = creator?.portfolioBalance || 10000

  // ── Run pipeline ──────────────────────────────────────────────────────────
  const sentimentOutput = await runSentimentModule(sentimentMod?.config || {})
  const riskOutput      = await runRiskModule(sentimentOutput, riskMod?.config || {}, portfolioBalance)
  const executorOutput  = await runExecutorModule(riskOutput, executorMod?.config || {})

  // ── Submit trade ──────────────────────────────────────────────────────────
  let tradePlaced = false
  let tradeId     = null

  if (executorOutput.action === 'BUY') {
    const orderResult = await submitOrder({
      symbol:     sentimentOutput.pair,
      side:       'BUY',
      size:       executorOutput.size / (riskOutput.currentPrice || 1),  // convert USD → base asset
      price:      riskOutput.currentPrice,
      stopLoss:   riskOutput.stopLoss,
      takeProfit: riskOutput.takeProfit,
      exchange:   executorOutput.exchange,
      slippage:   executorOutput.slippage,
    })
    tradePlaced = orderResult?.status === 'filled'
    tradeId     = orderResult?.tradeId || null
  }

  // Simulated PnL (real PnL would come from a follow-up price check)
  const pnl = tradePlaced ? parseFloat(((Math.random() - 0.38) * 5).toFixed(3)) : null

  // ── Save execution to DB ──────────────────────────────────────────────────
  const execution = await Execution.create({
    strategyId,
    moduleOutputs: {
      sentiment: {
        score:      sentimentOutput.score,
        confidence: sentimentOutput.confidence,
        pass:       sentimentOutput.pass,
      },
      risk: {
        pass:       riskOutput.pass,
        maxSize:    riskOutput.maxSize,
        stopLoss:   riskOutput.stopLoss,
        takeProfit: riskOutput.takeProfit,
      },
      executor: {
        action: executorOutput.action,
        size:   executorOutput.size,
        reason: executorOutput.reason,
      },
    },
    tradePlaced,
    tradeId,
    pnl,
    status: 'success',
  })

  // ── Log to chain ──────────────────────────────────────────────────────────
  const txHash = await logToChain({
    strategyId: strategyId.toString(),
    sentimentScore: sentimentOutput.score,
    riskPass: riskOutput.pass,
    tradeId,
    success: tradePlaced,
  })

  if (txHash) {
    await Execution.findByIdAndUpdate(execution._id, { onChainTxHash: txHash })
  }

  // ── Update strategy stats ─────────────────────────────────────────────────
  if (tradePlaced) {
    const prev     = strategy.stats
    const newTotal = prev.totalTrades + 1
    const newPnl   = prev.totalPnL + (pnl || 0)
    const prevWins = Math.round((prev.winRate || 0) * prev.totalTrades)
    const newWins  = prevWins + ((pnl || 0) > 0 ? 1 : 0)

    // ── Compute Sharpe ratio from recent executions ───────────────────────
    const recentExecs = await Execution.find({ strategyId, pnl: { $ne: null } })
      .sort({ timestamp: -1 }).limit(30).lean()
    const pnls = recentExecs.map((e) => e.pnl)
    let sharpeRatio = 0
    if (pnls.length >= 3) {
      const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length
      const variance = pnls.reduce((a, b) => a + (b - mean) ** 2, 0) / pnls.length
      const stdDev = Math.sqrt(variance)
      // Annualised Sharpe (risk-free rate ≈ 0, 288 5-min candles/day)
      sharpeRatio = stdDev > 0 ? parseFloat(((mean / stdDev) * Math.sqrt(288 * 365)).toFixed(2)) : 0
    }

    // ── Circuit Breaker Logic ─────────────────────────────────────────────────
    let peakPnL = prev.peakPnL || 0
    let currentDrawdown = prev.currentDrawdown || 0
    let status = strategy.status

    if (newPnl > peakPnL) {
      peakPnL = newPnl
      currentDrawdown = 0
    } else {
      currentDrawdown = peakPnL - newPnl
    }

    const threshold = prev.maxDrawdownThreshold || 20
    if (currentDrawdown > threshold) {
      console.warn(`[CIRCUIT BREAKER] Strategy ${strategyId} paused due to drawdown (${currentDrawdown.toFixed(2)}% > ${threshold}%)`)
      status = 'paused'
    }

    await Strategy.findByIdAndUpdate(strategyId, {
      'stats.totalTrades':  newTotal,
      'stats.totalPnL':     parseFloat(newPnl.toFixed(3)),
      'stats.winRate':      parseFloat((newWins / newTotal).toFixed(4)),
      'stats.sharpeRatio':  sharpeRatio,
      'stats.peakPnL':      parseFloat(peakPnL.toFixed(3)),
      'stats.currentDrawdown': parseFloat(currentDrawdown.toFixed(3)),
      status,
      $inc: { usageCount: 1 },
    })

    // ── Distribute royalties ───────────────────────────────────────────────
    await distributeRoyaltiesOffChain(strategy, modules)
  }

  return {
    executionId:     execution._id,
    sentimentOutput,
    riskOutput,
    executorOutput,
    tradePlaced,
    tradeId,
    pnl,
    txHash,
    source: {
      sentiment: sentimentOutput.source,
      order:     tradePlaced ? (tradeId ? 'sodex' : 'mock') : 'none',
      chain:     txHash ? 'on-chain' : 'off-chain',
    },
  }
}

module.exports = { executeStrategy }

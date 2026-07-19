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

async function executeStrategy(strategyId, network = 'testnet') {
  const strategy = await Strategy.findById(strategyId)
  if (!strategy || strategy.status !== 'active') {
    return { skipped: true, reason: 'Strategy not active' }
  }

  const modules     = strategy.config.modules || []
  const connections = strategy.config.connections || []

  const User = require('../models/User') // inline require to avoid circular deps if any
  const creator = await User.findById(strategy.creatorId).select('portfolioBalance')
  const portfolioBalance = creator?.portfolioBalance || 10000

  // ── Build DAG and Topological Sort ────────────────────────────────────────
  const adj = {}
  const inDegree = {}
  modules.forEach(m => { adj[m.id] = []; inDegree[m.id] = 0 })

  connections.forEach(c => {
    if (adj[c.from] && inDegree[c.to] !== undefined) {
      adj[c.from].push(c.to)
      inDegree[c.to]++
    }
  })

  const queue = modules.filter(m => inDegree[m.id] === 0).map(m => m.id)
  const sortedIds = []
  while (queue.length > 0) {
    const curr = queue.shift()
    sortedIds.push(curr)
    adj[curr].forEach(neighbor => {
      inDegree[neighbor]--
      if (inDegree[neighbor] === 0) queue.push(neighbor)
    })
  }

  // Fallback if no edges exist (backward compatibility for old strategies)
  if (sortedIds.length === 0 && modules.length > 0) {
    sortedIds.push(...modules.map(m => m.id))
  }

  // ── Run DAG Pipeline ──────────────────────────────────────────────────────
  let accumulatedState = { pass: true, pair: 'BTC/USD', maxSize: 0, currentPrice: 0 }
  let finalExecutorOutput = null
  let finalSentimentOutput = null
  let finalRiskOutput = null

  for (const nodeId of sortedIds) {
    if (!accumulatedState.pass) break; // Circuit break if any node fails

    const mod = modules.find(m => m.id === nodeId)
    const type = (mod.type || '').toLowerCase()

    if (type.includes('sentiment')) {
      const out = await runSentimentModule(mod.config)
      finalSentimentOutput = out
      accumulatedState = { ...accumulatedState, ...out, pass: out.pass }
    } 
    else if (type.includes('risk')) {
      const out = await runRiskModule(accumulatedState, mod.config, portfolioBalance)
      finalRiskOutput = out
      accumulatedState = { ...accumulatedState, ...out, pass: out.pass }
    } 
    else if (type.includes('exec')) {
      const out = await runExecutorModule(accumulatedState, mod.config)
      if (network) out.network = network // inject network
      finalExecutorOutput = out
      accumulatedState = { ...accumulatedState, ...out, pass: out.pass }
    }
  }

  // Fallbacks for logging if specific nodes were missing in the DAG
  const sentimentOutput = finalSentimentOutput || { score: 0, confidence: 0, pass: accumulatedState.pass, source: 'none' }
  const riskOutput = finalRiskOutput || { pass: accumulatedState.pass, maxSize: accumulatedState.maxSize || 0, stopLoss: 0, takeProfit: 0 }
  const executorOutput = finalExecutorOutput || { action: 'HOLD', size: 0, reason: accumulatedState.pass ? 'No executor node' : 'Pipeline failed' }

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

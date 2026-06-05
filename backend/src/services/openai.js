const axios = require('axios')

function client() {
  const key = process.env.AZURE_OPENAI_KEY
  const url = process.env.AZURE_OPENAI_URL
  if (!key || !url) return null
  return { key, url }
}

async function chat(systemPrompt, userPrompt, jsonMode = false) {
  const cfg = client()
  if (!cfg) throw new Error('Azure OpenAI not configured')

  const body = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    max_tokens: 1000,
    temperature: 0.4,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  }

  const res = await axios.post(cfg.url, body, {
    headers: { 'Content-Type': 'application/json', 'api-key': cfg.key },
    timeout: 20000,
  })

  return res.data.choices[0].message.content
}

const GENERATE_SYSTEM = `You are a DeFi strategy builder AI for StrategyOS.
Convert user descriptions into a trading strategy pipeline with exactly 3 modules in this order: Sentiment → RiskCheck → Executor.

Respond ONLY with valid JSON in this exact format:
{
  "name": "strategy name (short, descriptive)",
  "nodes": [
    { "id": "n1", "type": "moduleNode", "position": { "x": 80, "y": 160 }, "data": { "type": "Sentiment", "label": "Sentiment", "config": { "pair": "BTC/USD", "minConfidence": 60 } } },
    { "id": "n2", "type": "moduleNode", "position": { "x": 330, "y": 160 }, "data": { "type": "RiskCheck", "label": "Risk Check", "config": { "maxPosition": 10, "stopLoss": 5, "takeProfit": 10 } } },
    { "id": "n3", "type": "moduleNode", "position": { "x": 580, "y": 160 }, "data": { "type": "Executor", "label": "Executor", "config": { "exchange": "SoDEX", "slippage": 0.5, "orderType": "market" } } }
  ],
  "edges": [
    { "id": "e1-2", "source": "n1", "target": "n2", "animated": true, "style": { "stroke": "#6366f1" } },
    { "id": "e2-3", "source": "n2", "target": "n3", "animated": true, "style": { "stroke": "#6366f1" } }
  ]
}

Rules:
- pair must be one of: "BTC/USD", "ETH/USD", "SOL/USD"
- minConfidence: 40-90 (how confident AI must be before trading)
- maxPosition: 1-25 (% of portfolio per trade)
- stopLoss: 1-20 (% loss before exit)
- takeProfit: 2-50 (% gain target)
- slippage: 0.1-2.0
- orderType: "market" or "limit"
- Adjust all values based on user's risk preference (conservative = lower position, tight stop; aggressive = higher position, wider stop)`

const ANALYZE_SYSTEM = `You are an expert DeFi strategy analyst for StrategyOS.
Analyze trading strategy execution data and provide actionable insights.
Be concise — 3-4 sentences max. Focus on: performance patterns, risk assessment, and one specific improvement.
Speak directly to the user. Use numbers from the data.`

async function generateStrategy(prompt) {
  const content = await chat(GENERATE_SYSTEM, `Build a strategy: ${prompt}`, true)
  return JSON.parse(content)
}

async function analyzeStrategy(strategyName, stats, executions) {
  const summary = {
    name: strategyName,
    totalTrades: stats.totalTrades || 0,
    winRate: stats.winRate ? `${(stats.winRate * 100).toFixed(0)}%` : 'N/A',
    totalPnL: `${(stats.totalPnL || 0).toFixed(2)}%`,
    sharpe: stats.sharpeRatio?.toFixed(2) || 'N/A',
    recentExecutions: executions.slice(0, 10).map(e => ({
      time: new Date(e.timestamp).toLocaleDateString(),
      sentiment: e.moduleOutputs?.sentiment?.score,
      riskPass: e.moduleOutputs?.risk?.pass,
      action: e.tradePlaced ? 'TRADE' : 'HOLD',
      pnl: e.pnl?.toFixed(3),
    }))
  }
  return chat(ANALYZE_SYSTEM, `Analyze this strategy: ${JSON.stringify(summary)}`)
}

const STRATEGY_CHAT_SYSTEM = `You are the AI Strategy Assistant for StrategyOS.
You are embedded directly on a strategy's details page. 
The user is asking you questions about this specific strategy and its recent trades.
Be conversational, extremely helpful, and concise. 
Explain your reasoning using the exact data provided to you in the prompt (e.g., SoSoValue sentiment scores, PnL, risk parameters).`

async function chatWithStrategy(strategy, executions, userMessage) {
  const context = {
    strategyName: strategy.name,
    status: strategy.status,
    stats: strategy.stats,
    riskConfig: strategy.config.modules?.find(m => m.type === 'RiskCheck')?.config,
    recentExecutions: executions.slice(0, 5).map(e => ({
      time: new Date(e.timestamp).toISOString(),
      sentimentScore: e.moduleOutputs?.sentiment?.score,
      riskPass: e.moduleOutputs?.risk?.pass,
      action: e.tradePlaced ? e.moduleOutputs?.executor?.action : 'HOLD',
      pnl: e.pnl,
    }))
  }

  const prompt = `Context data: ${JSON.stringify(context)}\nUser question: ${userMessage}`
  return chat(STRATEGY_CHAT_SYSTEM, prompt)
}

module.exports = { generateStrategy, analyzeStrategy, chatWithStrategy }

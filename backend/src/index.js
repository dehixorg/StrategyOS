require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cron = require('node-cron')

const authRouter = require('./routes/auth')
const strategyRouter = require('./routes/strategy')
const executionRouter = require('./routes/execution')
const moduleRouter = require('./routes/module')
const earningsRouter = require('./routes/earnings')
const marketRouter   = require('./routes/market')
const aiRouter       = require('./routes/ai')
const { executeStrategy } = require('./services/strategyEngine')
const Strategy = require('./models/Strategy')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/auth', authRouter)
app.use('/strategy', strategyRouter)
app.use('/execution', executionRouter)
app.use('/module', moduleRouter)
app.use('/earnings', earningsRouter)
app.use('/market',   marketRouter)
app.use('/ai',       aiRouter)

app.get('/health', (_, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  integrations: {
    sosovalue: !!process.env.SOSOVALUE_API_KEY && process.env.SOSOVALUE_API_KEY !== 'your_sosovalue_api_key',
    sodex: !!(process.env.SODEX_WALLET_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY),
    valuechain: !!process.env.CONTRACT_ADDRESS && process.env.CONTRACT_ADDRESS !== '0xYourContractAddress',
    ai: !!process.env.AZURE_OPENAI_KEY,
  },
}))

// Run all active strategies every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const activeStrategies = await Strategy.find({ status: 'active' })
    console.log(`[Cron] Running ${activeStrategies.length} active strategies`)
    await Promise.allSettled(activeStrategies.map((s) => executeStrategy(s._id)))
  } catch (err) {
    console.error('[Cron] Error:', err.message)
  }
})

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/strategyos')
  .then(() => {
    console.log('[DB] Connected to MongoDB')
    app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message)
    process.exit(1)
  })

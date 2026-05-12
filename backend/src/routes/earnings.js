const express = require('express')
const Strategy = require('../models/Strategy')
const User = require('../models/User')
const auth = require('../middleware/auth')
const { getPendingEarnings } = require('../services/contract')

const router = express.Router()

// Get creator's earnings summary across all strategies
router.get('/summary', auth, async (req, res) => {
  try {
    const strategies = await Strategy.find({ creatorId: req.userId })

    const totalSOSO    = strategies.reduce((s, st) => s + (st.earnings?.totalSOSO || 0), 0)
    const pendingSOSO  = strategies.reduce((s, st) => s + (st.earnings?.pendingSOSO || 0), 0)
    const claimedSOSO  = strategies.reduce((s, st) => s + (st.earnings?.claimedSOSO || 0), 0)
    const totalUsage   = strategies.reduce((s, st) => s + (st.usageCount || 0), 0)

    // Also check on-chain balance if wallet is configured
    const user = await User.findById(req.userId)
    let onChainPending = '0'
    if (user?.walletAddress) {
      onChainPending = await getPendingEarnings(user.walletAddress)
    }

    res.json({
      totalSOSO:       parseFloat(totalSOSO.toFixed(6)),
      pendingSOSO:     parseFloat(pendingSOSO.toFixed(6)),
      claimedSOSO:     parseFloat(claimedSOSO.toFixed(6)),
      onChainPending,
      totalStrategies: strategies.length,
      totalUsage,
      breakdown: strategies.map((st) => ({
        strategyId:   st._id,
        name:         st.name,
        usageCount:   st.usageCount || 0,
        pendingSOSO:  st.earnings?.pendingSOSO || 0,
        totalSOSO:    st.earnings?.totalSOSO || 0,
      })),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Mark pending earnings as claimed (off-chain; on-chain claim goes through contract directly)
router.post('/claim', auth, async (req, res) => {
  try {
    const strategies = await Strategy.find({ creatorId: req.userId, 'earnings.pendingSOSO': { $gt: 0 } })

    let totalClaimed = 0
    for (const st of strategies) {
      totalClaimed += st.earnings.pendingSOSO
      await Strategy.findByIdAndUpdate(st._id, {
        $inc: {
          'earnings.claimedSOSO': st.earnings.pendingSOSO,
        },
        'earnings.pendingSOSO': 0,
      })
    }

    res.json({
      success: true,
      claimed: parseFloat(totalClaimed.toFixed(6)),
      message: totalClaimed > 0
        ? `Claimed ${totalClaimed.toFixed(4)} SOSO. On-chain claim: call claimEarnings() on the StrategyOS contract.`
        : 'No pending earnings to claim.',
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router

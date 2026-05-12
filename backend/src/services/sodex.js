const axios = require('axios')
const { ethers } = require('ethers')
const crypto = require('crypto')

// SoDEX REST base URLs
const MAINNET_BASE = 'https://mainnet-gw.sodex.dev/api/v1/spot'
const TESTNET_BASE = 'https://testnet-gw.sodex.dev/api/v1/spot'

// EIP-712 chain IDs
const CHAIN_IDS = { mainnet: 286623, testnet: 138565 }

// SoDEX symbol IDs for spot (from their docs — BTC/USDC = 1, ETH/USDC = 2)
const SYMBOL_IDS = {
  'BTC/USDC': 1, 'BTC/USD': 1,
  'ETH/USDC': 2, 'ETH/USD': 2,
  'SOL/USDC': 3, 'SOL/USD': 3,
}

function getConfig() {
  const key = process.env.SODEX_API_KEY
  const pk = process.env.SODEX_WALLET_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY
  const net = process.env.SODEX_NETWORK || 'testnet'
  const base = net === 'mainnet' ? MAINNET_BASE : TESTNET_BASE
  const chainId = CHAIN_IDS[net]
  const configured = key && key !== 'your_sodex_api_key' && pk && pk !== 'your_wallet_private_key_for_logging'
  return { configured, base, chainId, pk, accountID: process.env.SODEX_ACCOUNT_ID }
}

/**
 * Build and sign an EIP-712 typed data payload for SoDEX.
 * SoDEX uses: domain.name="spot", ExchangeAction type with payloadHash + nonce.
 */
async function signSodexAction(actionPayload, privateKey, chainId) {
  const wallet = new ethers.Wallet(privateKey)

  const payloadJson = JSON.stringify(actionPayload)
  const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(payloadJson))
  const nonce = BigInt(Date.now())

  const domain = {
    name: 'spot',
    version: '1',
    chainId,
  }

  const types = {
    ExchangeAction: [
      { name: 'payloadHash', type: 'bytes32' },
      { name: 'nonce', type: 'uint64' },
    ],
  }

  const value = { payloadHash, nonce }

  const sig = await wallet.signTypedData(domain, types, value)
  // SoDEX requires prepending byte 0x01 for typed signatures
  const typedSig = '0x01' + sig.slice(2)

  return { signature: typedSig, nonce: nonce.toString(), payloadHash }
}

async function submitOrder(order) {
  const cfg = getConfig()
  if (!cfg.configured) return mockSubmitOrder(order)

  try {
    const symbolID = SYMBOL_IDS[order.symbol] || 1
    const isBuy = order.side === 'BUY'

    const actionPayload = {
      type: 'newOrder',
      params: {
        accountID: parseInt(cfg.accountID || '0'),
        symbolID,
        orders: [{
          clOrdID: `sos-${Date.now()}`,
          modifier: 1,        // post-only = 0, normal = 1
          side: isBuy ? 1 : 2, // 1=buy, 2=sell
          type: 2,             // 1=limit, 2=market
          timeInForce: 3,      // 1=GTC, 2=IOC, 3=FOK
          quantity: String(order.size.toFixed(6)),
          reduceOnly: false,
          positionSide: 1,
        }],
      },
    }

    const { signature, nonce, payloadHash } = await signSodexAction(actionPayload, cfg.pk, cfg.chainId)

    const body = {
      action: actionPayload,
      nonce,
      payloadHash,
      signature,
    }

    const { data } = await axios.post(`${cfg.base}/orders`, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    })

    return {
      tradeId: data.data?.clOrdID || data.data?.orderId || `order-${Date.now()}`,
      status: data.data?.status === 0 ? 'filled' : 'pending',
      filledPrice: order.price,
      filledSize: order.size,
      exchange: 'SoDEX',
      raw: data,
      source: 'sodex',
    }
  } catch (err) {
    console.warn('[SoDEX] Order failed, using mock:', err.response?.data || err.message)
    return mockSubmitOrder(order)
  }
}

async function getOrderStatus(tradeId) {
  const cfg = getConfig()
  if (!cfg.configured) {
    return { tradeId, status: 'filled', filledAt: new Date().toISOString(), source: 'mock' }
  }

  try {
    const { data } = await axios.get(`${cfg.base}/orders/${tradeId}`, { timeout: 5000 })
    return data.data || data
  } catch (err) {
    console.warn('[SoDEX] Order status error:', err.message)
    return null
  }
}

async function getMarketPrice(symbol = 'BTC/USDC') {
  const cfg = getConfig()
  try {
    const symbolID = SYMBOL_IDS[symbol] || 1
    const { data } = await axios.get(`${cfg.base}/ticker`, {
      params: { symbolID },
      timeout: 5000,
    })
    return parseFloat(data.data?.last || data.data?.price || 0)
  } catch {
    const prices = { 'BTC/USDC': 67000, 'BTC/USD': 67000, 'ETH/USDC': 3500, 'ETH/USD': 3500, 'SOL/USDC': 185, 'SOL/USD': 185 }
    return prices[symbol] || 50000
  }
}

function mockSubmitOrder(order) {
  const filled = Math.random() > 0.1
  return {
    tradeId: crypto.randomBytes(16).toString('hex'),
    status: filled ? 'filled' : 'failed',
    filledPrice: (order.price || 67000) * (1 + (Math.random() - 0.5) * 0.001),
    filledSize: order.size,
    exchange: order.exchange || 'SoDEX',
    source: 'mock',
  }
}

module.exports = { submitOrder, getOrderStatus, getMarketPrice }

const { ethers } = require('ethers')

// StrategyOS ABI — only the functions backend needs to call
const ABI = [
  'function registerStrategy(bytes32 strategyId, address[] calldata moduleCreators) external',
  'function activateStrategy(bytes32 strategyId) external',
  'function pauseStrategy(bytes32 strategyId) external',
  'function logExecution(bytes32 strategyId, int256 sentiment, bool riskPass, bytes32 tradeId, bool success) external',
  'function getExecutions(bytes32 strategyId) external view returns (tuple(bytes32 strategyId, uint256 timestamp, int256 sentiment, bool riskPass, bytes32 tradeId, bool success, uint256 feeCharged)[])',
  'function getStrategy(bytes32 strategyId) external view returns (tuple(address creator, bytes32 strategyId, bool active, uint256 totalExecutions, uint256 totalFeesEarned, address[] moduleCreators, uint256 registeredAt))',
  'function getPendingEarnings(address creator) external view returns (uint256)',
  'function claimEarnings() external',
  'event ExecutionLogged(bytes32 indexed strategyId, uint256 timestamp, int256 sentiment, bool riskPass, bytes32 tradeId, bool success, uint256 feeCharged)',
  'event StrategyRegistered(bytes32 indexed strategyId, address indexed creator, address[] moduleCreators)',
]

// ERC-20 ABI for SOSO token approval (needed before registerStrategy)
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
]

function getProvider() {
  const rpc = process.env.VALUECHAIN_RPC || process.env.ARBITRUM_RPC
  if (!rpc) return null
  return new ethers.JsonRpcProvider(rpc)
}

function getSigner() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY
  const provider = getProvider()
  if (!pk || !provider || pk === 'your_wallet_private_key_for_logging') return null
  return new ethers.Wallet(pk, provider)
}

function getContract() {
  const addr = process.env.CONTRACT_ADDRESS
  const signer = getSigner()
  if (!addr || !signer || addr === '0xYourContractAddress') return null
  return new ethers.Contract(addr, ABI, signer)
}

function getSosoToken() {
  const addr = process.env.SOSO_TOKEN_ADDRESS
  const signer = getSigner()
  if (!addr || !signer) return null
  return new ethers.Contract(addr, ERC20_ABI, signer)
}

// Convert a MongoDB ObjectId string to a bytes32 value
function toBytes32(str) {
  const hex = Buffer.from(str.slice(0, 31), 'utf8').toString('hex').padEnd(64, '0')
  return '0x' + hex
}

async function registerStrategy(strategyId, moduleCreatorAddresses) {
  const contract = getContract()
  if (!contract) {
    console.log('[Contract] Skipping registerStrategy (not configured)')
    return null
  }
  try {
    const b32 = toBytes32(strategyId)
    const tx = await contract.registerStrategy(b32, moduleCreatorAddresses)
    const receipt = await tx.wait()
    console.log(`[Contract] Strategy registered: ${receipt.hash}`)
    return receipt.hash
  } catch (err) {
    console.error('[Contract] registerStrategy failed:', err.message)
    return null
  }
}

async function logExecution({ strategyId, sentimentScore, riskPass, tradeId, success }) {
  const contract = getContract()
  if (!contract) {
    console.log('[Contract] Skipping logExecution (not configured)')
    return null
  }
  try {
    const b32StratId = toBytes32(strategyId)
    const b32TradeId = tradeId
      ? toBytes32(tradeId)
      : ethers.ZeroHash

    const tx = await contract.logExecution(
      b32StratId,
      BigInt(Math.round(sentimentScore || 0)),
      Boolean(riskPass),
      b32TradeId,
      Boolean(success)
    )
    const receipt = await tx.wait()
    console.log(`[Contract] Execution logged: ${receipt.hash}`)
    return receipt.hash
  } catch (err) {
    console.error('[Contract] logExecution failed:', err.message)
    return null
  }
}

async function getPendingEarnings(walletAddress) {
  const contract = getContract()
  if (!contract) return '0'
  try {
    const raw = await contract.getPendingEarnings(walletAddress)
    return ethers.formatEther(raw)
  } catch {
    return '0'
  }
}

async function getOnChainExecutions(strategyId) {
  const contract = getContract()
  if (!contract) return []
  try {
    return await contract.getExecutions(toBytes32(strategyId))
  } catch {
    return []
  }
}

module.exports = {
  logExecution,
  registerStrategy,
  getPendingEarnings,
  getOnChainExecutions,
  toBytes32,
}

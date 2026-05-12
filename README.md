# StrategyOS — No-Code AI Strategy Marketplace for DeFi

Build AI-powered DeFi trading strategies by drag-dropping modules. Strategy creators and module developers earn **SOSO tokens** automatically on every execution — distributed on-chain via the StrategyOS smart contract on **ValueChain**.

---

## Architecture

```
soso/
├── frontend/        React 18 + Vite + ReactFlow + Tailwind CSS v4
├── backend/         Node.js + Express 5 + MongoDB + node-cron
├── contracts/       Solidity 0.8 — StrategyOS.sol (ValueChain)
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or Atlas URI)
- SoSoValue API key: [sosovalue.com/developer](https://sosovalue.com/developer) (free, first 1000 applicants)
- SoDEX account + EVM wallet for signing orders
- StrategyOS contract deployed on ValueChain (see below)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in SOSOVALUE_API_KEY, SODEX_WALLET_PRIVATE_KEY, CONTRACT_ADDRESS, etc.
npm install
npm run dev
# → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# → http://localhost:5173
```

### 3. Smart Contract (StrategyOS.sol)

1. Open [Remix IDE](https://remix.ethereum.org)
2. Paste `contracts/StrategyOS.sol`
3. Compile with Solidity 0.8.0
4. In MetaMask: add ValueChain network
   - Mainnet RPC: `https://mainnet-gw.sodex.dev` | ChainID: `286623`
   - Testnet RPC: `https://testnet-gw.sodex.dev` | ChainID: `138565`
5. Deploy `StrategyOS` with args: `(sosoTokenAddress, yourTreasuryWallet)`
6. Copy contract address → `backend/.env` → `CONTRACT_ADDRESS`
7. Fund the contract with SOSO tokens (call `fundContract(amount)`) so it can pay execution royalties

---

## How It Works

### Strategy Pipeline

```
SoSoValue Sentiment API
        ↓
  Score + Confidence
        ↓
   Risk Check Module
   (position sizing, SL/TP)
        ↓
  SoDEX Executor Module
  (EIP-712 signed order)
        ↓
  On-chain log → ValueChain
  (StrategyOS.logExecution)
```

### SOSO Token Fee Flow

Every execution that places a trade triggers a **0.1 SOSO** fee, split automatically on-chain:

| Recipient | Share |
|---|---|
| Strategy creator | **70%** |
| Module creators (split equally) | **20%** |
| Protocol treasury | **10%** |

Earnings accumulate in `creatorEarnings[address]` and are claimable anytime via `claimEarnings()`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Random secret for JWT signing |
| `SOSOVALUE_API_KEY` | SoSoValue API key — header: `x-soso-api-key` |
| `SODEX_WALLET_PRIVATE_KEY` | EVM wallet private key for EIP-712 order signing |
| `SODEX_ACCOUNT_ID` | Your SoDEX account ID |
| `SODEX_NETWORK` | `testnet` or `mainnet` |
| `VALUECHAIN_RPC` | ValueChain RPC URL |
| `CONTRACT_ADDRESS` | Deployed StrategyOS contract |
| `SOSO_TOKEN_ADDRESS` | SOSO ERC-20 token address on ValueChain |
| `DEPLOYER_PRIVATE_KEY` | Operator wallet for `logExecution` calls |
| `TREASURY_WALLET` | Treasury wallet address |
| `FRONTEND_URL` | CORS allowed origin |

---

## API Reference

### Auth
```
POST /auth/signup    { email, password }
POST /auth/login     { email, password }
```

### Strategy
```
POST   /strategy/create                Create strategy → auto-registers on ValueChain
GET    /strategy/my-strategies         List user's strategies with earnings stats
GET    /strategy/marketplace/top       Top active strategies by usage count
GET    /strategy/:id                   Full strategy details
PUT    /strategy/:id                   Update strategy config
```

### Execution
```
POST /execution/activate               Start auto-execution (cron every 5 min)
POST /execution/pause                  Pause strategy
POST /execution/execute                Manual trigger (for demo/testing)
GET  /execution/status/:strategyId     Execution history (50 most recent)
```

### Earnings
```
GET  /earnings/summary                 SOSO earnings across all strategies
POST /earnings/claim                   Mark pending earnings as claimed (off-chain)
```

### Modules
```
GET /module/browse?category=Sentiment&sortBy=rating
```

### Health
```
GET /health    → { status, integrations: { sosovalue, sodex, valuechain } }
```

---

## SoSoValue Integration

**Base URL:** `https://openapi.sosovalue.com/openapi/v1`  
**Auth:** `x-soso-api-key: YOUR_KEY`  
**Rate limit:** 20 req/min, 100k/month (free tier)

Sentiment is computed from 3 signals (no single sentiment endpoint exists):
1. **Price momentum** (50% weight) — from `/currencies/{id}/market-snapshot`, `change_pct_24h`
2. **News volume** (30% weight) — from `/news/hot`, article count as attention proxy
3. **Sector context** (20% weight) — from `/currencies/sector-spotlight`, avg sector change

Result: score −100 to +100, confidence 0–1.

---

## SoDEX Integration

**Mainnet REST:** `https://mainnet-gw.sodex.dev/api/v1/spot`  
**Testnet REST:** `https://testnet-gw.sodex.dev/api/v1/spot`  
**Auth:** EIP-712 typed signatures — domain name `"spot"`, chainId `286623` (mainnet) / `138565` (testnet)

Order signing flow:
1. Build `actionPayload` JSON (`newOrder` type with symbol, side, qty)
2. `keccak256` hash the payload → `payloadHash`
3. EIP-712 sign `{payloadHash, nonce}` with your EVM wallet
4. Prepend `0x01` to signature bytes → `typedSig`
5. POST `{action, nonce, payloadHash, signature}` to `/orders`

---

## Smart Contract — StrategyOS.sol

Deployed on **ValueChain** (EVM-compatible L1, chainId 286623).

Key functions:
```solidity
registerStrategy(bytes32 strategyId, address[] moduleCreators)  // pays ACTIVATION_FEE (1 SOSO)
logExecution(bytes32 strategyId, int256 sentiment, bool riskPass, bytes32 tradeId, bool success)
claimEarnings()         // pull pending SOSO to your wallet
getPendingEarnings(address)
```

The backend `DEPLOYER_PRIVATE_KEY` wallet must be set as `operator` on the contract (done automatically — deployer is initial operator).

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
# Set VITE_BACKEND_URL env var in Vercel dashboard
vercel deploy --prod
```

### Backend → Railway
```bash
# Push repo to GitHub → connect on railway.app
# Set all env vars in Railway dashboard
# railway.json is pre-configured (start: node src/index.js, health: /health)
```

### Database → MongoDB Atlas
1. Create free cluster at mongodb.com/atlas
2. Copy connection string → `MONGODB_URI`

---

## Submission Checklist

- [x] Drag-drop strategy builder (ReactFlow)
- [x] SoSoValue API — live sentiment from price + news + sector data
- [x] SoDEX API — EIP-712 signed orders on ValueChain
- [x] On-chain execution logging (StrategyOS contract, ValueChain)
- [x] SOSO token fee distribution — 70/20/10 creator/module/treasury split
- [x] Creator earnings dashboard + claim flow
- [x] Auto-execution every 5 min via cron
- [x] Manual "Execute Now" button in UI
- [x] Module marketplace with real backend API
- [x] "Add to Builder" flow from marketplace
- [x] Vercel + Railway + MongoDB Atlas deploy configs
- [ ] Apply for SoSoValue API key: sosovalue.com/developer
- [ ] Deploy StrategyOS.sol on ValueChain testnet (Remix)
- [ ] Fund contract with SOSO for royalty payouts
- [ ] Set SODEX_WALLET_PRIVATE_KEY in backend .env
- [ ] Deploy frontend to Vercel, backend to Railway
- [ ] Record 5-min demo video

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, ReactFlow, Tailwind CSS v4 |
| Backend | Node.js, Express 5, Mongoose, node-cron |
| Database | MongoDB |
| Smart Contract | Solidity 0.8, ValueChain L1 (chainId 286623) |
| Sentiment API | SoSoValue — `openapi.sosovalue.com/openapi/v1` |
| Trading API | SoDEX — `mainnet-gw.sodex.dev/api/v1/spot` |
| Order Auth | EIP-712 typed signatures (ethers.js v6) |
| On-chain | ethers.js v6, SOSO ERC-20 fee distribution |
| Deploy | Vercel (frontend), Railway (backend), Atlas (DB) |

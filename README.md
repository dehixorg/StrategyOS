# StrategyOS — The "n8n for DeFi" 🚀

> **🏆 Built for the SoSoValue & SoDEX Buildathon (Wave 3 Finalist)**

StrategyOS is a decentralized, modular marketplace that democratizes institutional-grade quantitative trading. By decoupling *alpha generation* from *capital execution*, we allow researchers to monetize their proprietary trading logic visually, and retail investors to deploy professional-grade strategies with zero code.

It is an **"n8n for DeFi"** — powered natively by SoSoValue intelligence, executed on SoDEX, and settled immutably on the ValueChain network.

---

## 🌟 The Vision & Features

### 1. Visual DAG Workflow Builder (No-Code Alpha)
Quantitative researchers use our drag-and-drop ReactFlow canvas to build trading pipelines. Instead of writing complex Python bots, users simply wire together **Sentiment Nodes**, **Risk Nodes**, and **Executor Nodes**. The backend topological engine dynamically parses this Directed Acyclic Graph (DAG) and executes it sequentially.

### 2. Deep SoSoValue Data Integration (The Brain)
We pushed the sponsor tech stack to its absolute limit. Our algorithmic Sentiment Node fetches and calculates a composite score using **6 distinct SoSoValue API streams**:
1. Market Snapshots (Price Momentum)
2. ETF Net Flows (Institutional Volume)
3. Hot News Velocity
4. Sector Spotlight (Market Breadth)
5. Macro Events (Keywords like "Rate Cuts", "Inflation")
6. Venture Capital Fundraising Volume

### 3. Institutional Risk & Circuit Breakers (The Shield)
The platform continuously calculates Sharpe Ratios and Max Drawdowns. The Risk Node acts as an automated Circuit Breaker—if market sentiment drops or the portfolio hits a drawdown threshold, it instantly issues a `HOLD` signal to protect investor capital, dynamically injecting Stop-Losses and Take-Profits into every order payload.

### 4. SoDEX Execution & Live Trace UI (The Hands)
Once logic passes, exact order payloads (with slippage protection) are generated and signed via EIP-712 directly to the **SoDEX API** (with a seamless UI toggle between Testnet and Mainnet). 
**Proof of Execution:** We built an animated "Live Execution Trace" dashboard. Users can visually track the data pipeline in real-time as it moves from SoSoValue ➔ Risk Check ➔ SoDEX Order ➔ ValueChain hash.

### 5. ValueChain Settlement & SOSO Creator Economy (The Ledger)
**The Challenge:** Deploying directly on emerging networks like ValueChain can be difficult due to RPC stability. 
**The Solution:** Because ValueChain is an Arbitrum Orbit L3/L2 rollup, we seamlessly deployed our `StrategyOS.sol` master smart contract onto the Arbitrum Sepolia network (acting as the ValueChain testnet proxy). 
* **Trustless Transparency:** Every single execution (the Risk pass/fail logic and the SoDEX Trade ID) is permanently hashed to the blockchain. 
* **Smart SOSO Split:** The contract uses the `SOSO` token to charge execution fees, splitting it automatically: **70% to Strategy Creators, 20% to Module Developers, 10% to the Protocol.**

### 6. Embedded Azure AI (GPT-4o)
Every strategy page features an integrated Azure AI assistant. It dynamically reads the DAG architecture and execution history of the strategy, translating the quantitative logic into plain English for retail investors.

---

## 🛠 Architecture & Tech Stack

```
soso/
├── frontend/        React 18 + Vite + ReactFlow + Tailwind CSS v4 + Vercel
├── backend/         Node.js + Express 5 + MongoDB + node-cron + Render
├── contracts/       Solidity 0.8 — StrategyOS.sol (Deployed on Arbitrum Sepolia / ValueChain)
└── README.md
```

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, ReactFlow, Tailwind CSS |
| **Backend** | Node.js, Express 5, Mongoose, node-cron |
| **Database** | MongoDB Atlas |
| **Smart Contract** | Solidity 0.8, ValueChain / Arbitrum Sepolia (chainId 421614) |
| **Sentiment API** | SoSoValue (`openapi.sosovalue.com`) |
| **Trading API** | SoDEX API (EIP-712 typed signatures) |
| **AI Layer** | Azure OpenAI (GPT-4o-mini) |

---

## 🚀 Quick Start (Local Execution)

If you want to run the pipeline locally and see the Execution Trace in action:

### 1. Backend Engine
```bash
cd backend
npm install
# Ensure your .env is configured with MongoDB, SoSoValue API Key, and SoDEX Wallet Keys.
npm run dev
# The backend topological engine and cron jobs are now running on http://localhost:3001
```

### 2. Frontend Visualizer
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

Navigate to a strategy and click **"Execute Trace"** to watch the SoSoValue ➔ SoDEX ➔ ValueChain pipeline run in real-time!

---

## 🔮 What's Next for StrategyOS (Roadmap)

1. **Zero-Knowledge (zk) Strategy Logic:** Allowing quants to hide their proprietary "secret sauce" alpha logic, but still cryptographically prove to ValueChain that the execution was mathematically legitimate.
2. **Cross-Chain Arbitrage Nodes:** Adding DAG execution nodes that simultaneously ping SoDEX on Optimism, Arbitrum, and Base, automatically routing the trade to the chain with the lowest slippage.
3. **Social Graph Sentiment Nodes:** Ingesting decentralized social sentiment (Farcaster/X) and combining it with the SoSoValue macroeconomic data for an even deeper AI score.
4. **"Fund-of-Funds" Index Tokens:** Allowing retail investors to wrap the Top 5 highest-performing strategies on the platform into a single ERC-20 index token.

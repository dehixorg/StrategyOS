const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n=== StrategyOS Deployment — ValueChain Testnet ===");
  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatEther(balance), "ETH\n");

  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient gas token — need at least 0.001 on ValueChain Testnet");
  }

  // 1. Deploy MockSOSO
  console.log("1/3  Deploying MockSOSO token...");
  const MockSOSO = await ethers.getContractFactory("MockSOSO");
  const sosoToken = await MockSOSO.deploy(1_000_000);
  await sosoToken.waitForDeployment();
  const sosoAddr = await sosoToken.getAddress();
  console.log("     MockSOSO deployed →", sosoAddr);

  // 2. Deploy StrategyOS
  console.log("2/3  Deploying StrategyOS...");
  const StrategyOS = await ethers.getContractFactory("StrategyOS");
  const strategyOS = await StrategyOS.deploy(sosoAddr, deployer.address);
  await strategyOS.waitForDeployment();
  const contractAddr = await strategyOS.getAddress();
  console.log("     StrategyOS deployed →", contractAddr);

  // 3. Fund contract with 1000 SOSO for execution royalties
  console.log("3/3  Funding contract with 1000 SOSO...");
  const fundAmount = ethers.parseEther("1000");
  await (await sosoToken.approve(contractAddr, fundAmount)).wait();
  await (await strategyOS.fundContract(fundAmount)).wait();
  console.log("     Funded ✓");

  // 4. Auto-patch backend/.env
  const envPath = path.join(__dirname, "../../backend/.env");
  let env = fs.readFileSync(envPath, "utf8");
  env = env
    .replace(/CONTRACT_ADDRESS=.*/,   `CONTRACT_ADDRESS=${contractAddr}`)
    .replace(/SOSO_TOKEN_ADDRESS=.*/, `SOSO_TOKEN_ADDRESS=${sosoAddr}`)
    .replace(/TREASURY_WALLET=.*/,    `TREASURY_WALLET=${deployer.address}`)
    .replace(/VALUECHAIN_RPC=.*/,     `VALUECHAIN_RPC=https://testnet-gw.sodex.dev`);
  fs.writeFileSync(envPath, env);
  console.log("\n✅ backend/.env updated automatically\n");

  console.log("=== Done ===");
  console.log("SOSO_TOKEN_ADDRESS :", sosoAddr);
  console.log("CONTRACT_ADDRESS   :", contractAddr);
  console.log("TREASURY_WALLET    :", deployer.address);
  console.log("Explorer           : https://testnet.valuechain.xyz/address/" + contractAddr);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });

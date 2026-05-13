require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: "../backend/.env" });

const PK = process.env.DEPLOYER_PRIVATE_KEY;
const validPK = PK && PK !== "your_wallet_private_key_for_logging" && PK !== "your_evm_wallet_private_key";

module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "./src",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: validPK ? [PK] : [],
    },
  },
};

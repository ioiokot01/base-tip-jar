require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Accept the deploy key with or without a leading "0x".
const rawKey = (process.env.PRIVATE_KEY || "").trim();
const accounts = rawKey
  ? [rawKey.startsWith("0x") ? rawKey : "0x" + rawKey]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts,
    },
  },
};

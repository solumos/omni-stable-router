require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31338, // Custom chain ID for Arbitrum fork
      forking: {
        url: "https://arb1.arbitrum.io/rpc",
        blockNumber: 200000000 // Recent Arbitrum block
      },
      mining: {
        auto: true,
        interval: 0
      }
    }
  }
};
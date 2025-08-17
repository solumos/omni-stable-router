// Real testnet protocol addresses for Base Sepolia and Arbitrum Sepolia

module.exports = {
  // CCTP (Circle Cross-Chain Transfer Protocol) - Real addresses
  cctp: {
    baseSepolia: {
      tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5", // CCTP TokenMessenger
      messageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD", // CCTP MessageTransmitter
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
      domain: 6 // Base Sepolia CCTP domain
    },
    arbitrumSepolia: {
      tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5", // CCTP TokenMessenger
      messageTransmitter: "0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872", // CCTP MessageTransmitter  
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Arbitrum Sepolia
      domain: 3 // Arbitrum Sepolia CCTP domain
    }
  },

  // LayerZero V2 - Real testnet endpoints
  layerZero: {
    baseSepolia: {
      endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero V2 Endpoint
      endpointId: 40245 // Base Sepolia LZ endpoint ID
    },
    arbitrumSepolia: {
      endpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // LayerZero V2 Endpoint
      endpointId: 40231 // Arbitrum Sepolia LZ endpoint ID
    }
  },

  // Uniswap V3 - For DEX swaps
  uniswap: {
    baseSepolia: {
      router: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4", // Uniswap V3 SwapRouter
      factory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", // Uniswap V3 Factory
      quoter: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27" // Uniswap V3 Quoter
    },
    arbitrumSepolia: {
      router: "0x101F443B4d1b059569D643917553c771E1b9663E", // Uniswap V3 SwapRouter
      factory: "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e", // Uniswap V3 Factory  
      quoter: "0x2779a0CC1c3e2b2B362b2D511B7F04B6f855947C" // Uniswap V3 Quoter
    }
  },

  // Test tokens (beyond USDC)
  tokens: {
    baseSepolia: {
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Native USDC
      weth: "0x4200000000000000000000000000000000000006", // Wrapped ETH
    },
    arbitrumSepolia: {
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Native USDC
      weth: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // Wrapped ETH
    }
  },

  // Chain IDs for reference
  chainIds: {
    baseSepolia: 84532,
    arbitrumSepolia: 421614
  }
};
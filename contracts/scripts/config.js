// Configuration for StableRouter deployment across chains

const config = {
  ethereum: {
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC || "https://eth.llamarpc.com",
    
    // Protocol addresses
    cctpTokenMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
    cctpMessageTransmitter: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
    layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2
    stargateRouter: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
    
    // Swap router (1inch, 0x, etc)
    swapRouter: "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
    
    // Token addresses
    tokens: {
      USDC: {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
        isNative: true
      },
      USDT: {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
        stargatePoolId: 2,
        isNative: true
      },
      PYUSD: {
        address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
        decimals: 6,
        oftAddress: "0xa2c323fe5a74adffad2bf3e007e36bb029606444", // OFT Adapter
        isNative: true
      },
      USDe: {
        address: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3",
        decimals: 18,
        oftAddress: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3", // TODO: Verify OFT adapter address
        isNative: true
      },
      crvUSD: {
        address: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",
        decimals: 18,
        oftAddress: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E", // TODO: Verify OFT adapter address
        isNative: true
      }
    }
  },
  
  arbitrum: {
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
    
    // Protocol addresses
    cctpTokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
    cctpMessageTransmitter: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
    layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2
    stargateRouter: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",
    
    // Swap router
    swapRouter: "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
    
    // Token addresses
    tokens: {
      USDC: {
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Native USDC
        decimals: 6,
        isNative: true
      },
      USDT: {
        address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        decimals: 6,
        stargatePoolId: 2,
        isNative: true
      },
      USDe: {
        address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
        decimals: 18,
        oftAddress: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
        isNative: true
      },
      crvUSD: {
        address: "0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5",
        decimals: 18,
        oftAddress: "0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5",
        isNative: true
      }
    }
  },
  
  optimism: {
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC || "https://mainnet.optimism.io",
    
    // Protocol addresses
    cctpTokenMessenger: "0x2B4069517957735bE00ceE0fadAE88a26365528f",
    cctpMessageTransmitter: "0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8",
    layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2
    stargateRouter: "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b",
    
    // Swap router
    swapRouter: "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
    
    // Token addresses
    tokens: {
      USDC: {
        address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native USDC
        decimals: 6,
        isNative: true
      },
      USDT: {
        address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
        decimals: 6,
        stargatePoolId: 2,
        isNative: true
      },
      PYUSD: {
        address: "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4",
        decimals: 6,
        oftAddress: "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4",
        isNative: true
      },
      crvUSD: {
        address: "0x061b87122Ed14b9526A813209C8a59a633257bAb",
        decimals: 18,
        oftAddress: "0x061b87122Ed14b9526A813209C8a59a633257bAb",
        isNative: true
      }
    }
  },
  
  base: {
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC || "https://mainnet.base.org",
    
    // Protocol addresses
    cctpTokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    cctpMessageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4",
    layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2
    stargateRouter: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B",
    
    // Swap router
    swapRouter: "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
    
    // Token addresses
    tokens: {
      USDC: {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native USDC
        decimals: 6,
        isNative: true
      },
      // Note: USDT not native on Base
      USDe: {
        address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
        decimals: 18,
        oftAddress: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
        isNative: true
      },
      crvUSD: {
        address: "0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93",
        decimals: 18,
        oftAddress: "0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93",
        isNative: true
      }
    }
  },
  
  polygon: {
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC || "https://polygon-rpc.com",
    
    // Protocol addresses
    cctpTokenMessenger: "0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE",
    cctpMessageTransmitter: "0xF3be9355363857F3e001be68856A2f96b4C39Ba9",
    layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2
    stargateRouter: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
    
    // Swap router
    swapRouter: "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
    
    // Token addresses
    tokens: {
      USDC: {
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Native USDC
        decimals: 6,
        isNative: true
      },
      USDT: {
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
        stargatePoolId: 2,
        isNative: true
      }
      // Note: PYUSD not deployed on Polygon
      // Note: USDe not deployed on Polygon  
      // Note: crvUSD not deployed on Polygon
    }
  },
  
  avalanche: {
    chainId: 43114,
    rpcUrl: process.env.AVALANCHE_RPC || "https://api.avax.network/ext/bc/C/rpc",
    
    // Protocol addresses
    cctpTokenMessenger: "0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982",
    cctpMessageTransmitter: "0x8186359aF5F57FbB40c6b14A588d2A59C0C29880",
    layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2
    stargateRouter: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd",
    
    // Swap router
    swapRouter: "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
    
    // Token addresses
    tokens: {
      USDC: {
        address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // Native USDC
        decimals: 6,
        isNative: true
      },
      USDT: {
        address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
        decimals: 6,
        stargatePoolId: 2,
        isNative: true
      }
      // Note: PYUSD not deployed on Avalanche
      // Note: USDe not deployed on Avalanche
      // Note: crvUSD not deployed on Avalanche
    }
  },
  
  // Testnet configurations
  sepolia: {
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC || "https://eth-sepolia.public.blastapi.io",
    
    // Testnet protocol addresses
    cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    layerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f", // V2 testnet
    stargateRouter: "0x0000000000000000000000000000000000000000", // Not available on testnet
    
    // Test swap router
    swapRouter: "0x0000000000000000000000000000000000000000",
    
    // Test token addresses
    tokens: {
      USDC: {
        address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Testnet USDC
        decimals: 6,
        isNative: true
      }
    }
  }
};

module.exports = { config };
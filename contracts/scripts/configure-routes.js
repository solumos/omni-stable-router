const { ethers } = require("hardhat");
const fs = require("fs");

// Protocol enum values
const Protocol = {
  NONE: 0,
  CCTP: 1,
  CCTP_HOOKS: 2,
  LAYERZERO: 3,
  STARGATE: 4
};

// Network configurations
const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    cctpDomain: 0,
    lzChainId: 10161,
    tokens: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    swapPools: {
      // Mock DEX pools for testing (using Uniswap V2 Router for simplicity)
      PYUSD_USDe: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router as mock
      PYUSD_USDC: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      USDe_USDC: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    },
    protocolContracts: {
      CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD", // Message Transmitter
      LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    }
  },
  baseSepolia: {
    chainId: 84532,
    cctpDomain: 6,
    lzChainId: 10245,
    tokens: {
      USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      // PYUSD not deployed on Base Sepolia
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    swapPools: {
      USDe_USDC: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", // Mock Base DEX
      PYUSD_USDe: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24", // Mock Base DEX for PYUSD → USDe
    },
    protocolContracts: {
      CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD", // Message Transmitter
      LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    }
  },
  arbitrumSepolia: {
    chainId: 421614,
    cctpDomain: 3,
    lzChainId: 10231,
    tokens: {
      USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      PYUSD: "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9", // Assuming same address on Arbitrum Sepolia
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    swapPools: {
      PYUSD_USDe: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Mock Arbitrum DEX
      PYUSD_USDC: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
      USDe_USDC: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"
    },
    protocolContracts: {
      CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD", // Message Transmitter
      LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    }
  },
  optimismSepolia: {
    chainId: 11155420,
    cctpDomain: 2,
    lzChainId: 10232,
    tokens: {
      USDC: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      // PYUSD not deployed on Optimism Sepolia
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    protocolContracts: {
      CCTP_TOKEN_MESSENGER: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      CCTP_MESSAGE_TRANSMITTER: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD", // Message Transmitter
      LAYERZERO_ENDPOINT: "0x6EDCE65403992e310A62460808c4b910D972f10f"
    }
  }
};

async function loadDeployment(network) {
  const deploymentPath = `./deployments/${network}-unified-router.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for ${network}. Run deploy-unified-router.js first.`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function configureRoutes() {
  const network = hre.network.name;
  const [owner] = await ethers.getSigners();
  
  console.log("============================================");
  console.log(`Configuring Routes on ${network}`);
  console.log("============================================\n");
  console.log("Owner:", owner.address);
  
  // Load deployment
  const deployment = await loadDeployment(network);
  const router = await ethers.getContractAt("UnifiedRouter", deployment.router);
  console.log("Router:", deployment.router);
  
  const sourceConfig = NETWORKS[network];
  if (!sourceConfig) {
    console.log("❌ Network not configured:", network);
    return;
  }
  
  console.log("\n📝 Configuring routes from", network, "to other networks...\n");
  
  let routesConfigured = 0;
  
  // Configure routes to all other networks
  for (const [destNetwork, destConfig] of Object.entries(NETWORKS)) {
    if (destNetwork === network) continue; // Skip same network
    
    console.log(`\n🔗 ${network} → ${destNetwork}`);
    console.log("─────────────────────────────");
    
    // Configure USDC → USDC route via CCTP
    if (sourceConfig.tokens.USDC && destConfig.tokens.USDC) {
      console.log("Configuring USDC → USDC (CCTP)...");
      
      // Check if already configured
      const isConfigured = await router.isRouteConfigured(
        sourceConfig.tokens.USDC,
        sourceConfig.chainId,
        destConfig.tokens.USDC,
        destConfig.chainId
      );
      
      if (isConfigured) {
        console.log("✅ Already configured");
      } else {
        try {
          const tx = await router.configureRoute(
            sourceConfig.tokens.USDC,      // fromToken
            sourceConfig.chainId,           // fromChainId
            destConfig.tokens.USDC,         // toToken
            destConfig.chainId,             // toChainId
            {
              protocol: Protocol.CCTP,
              protocolDomain: destConfig.cctpDomain,
              bridgeContract: sourceConfig.protocolContracts.CCTP_TOKEN_MESSENGER,
              poolId: 0,  // Not used for CCTP
              swapPool: "0x0000000000000000000000000000000000000000", // No swap for same token
              extraData: "0x"
            }
          );
          
          await tx.wait();
          console.log("✅ USDC route configured via CCTP");
          console.log("   Domain:", destConfig.cctpDomain);
          routesConfigured++;
        } catch (error) {
          console.log("❌ Failed to configure:", error.message);
        }
      }
    }
    
    // Configure PYUSD → PYUSD route via LayerZero OFT (same token)
    if (sourceConfig.tokens.PYUSD && destConfig.tokens.PYUSD) {
      console.log("Configuring PYUSD → PYUSD (LayerZero OFT)...");
      
      const isConfigured = await router.isRouteConfigured(
        sourceConfig.tokens.PYUSD,
        sourceConfig.chainId,
        destConfig.tokens.PYUSD,
        destConfig.chainId
      );
      
      if (isConfigured) {
        console.log("✅ Already configured");
      } else {
        try {
          const tx = await router.configureRoute(
            sourceConfig.tokens.PYUSD,
            sourceConfig.chainId,
            destConfig.tokens.PYUSD,
            destConfig.chainId,
            {
              protocol: Protocol.LAYERZERO,
              protocolDomain: destConfig.lzChainId,
              bridgeContract: sourceConfig.protocolContracts.LAYERZERO_ENDPOINT,
              poolId: 0,
              swapPool: "0x0000000000000000000000000000000000000000", // No swap needed
              extraData: "0x"
            }
          );
          
          await tx.wait();
          console.log("✅ PYUSD route configured via LayerZero");
          console.log("   LZ Chain ID:", destConfig.lzChainId);
          routesConfigured++;
        } catch (error) {
          console.log("❌ Failed to configure:", error.message);
        }
      }
    }
    
    // Configure PYUSD → USDe cross-token route via LayerZero Compose
    if (sourceConfig.tokens.PYUSD && destConfig.tokens.USDe && destConfig.swapPools?.PYUSD_USDe) {
      console.log("Configuring PYUSD → USDe (LayerZero Compose + DEX)...");
      
      const isConfigured = await router.isRouteConfigured(
        sourceConfig.tokens.PYUSD,
        sourceConfig.chainId,
        destConfig.tokens.USDe,
        destConfig.chainId
      );
      
      if (isConfigured) {
        console.log("✅ Already configured");
      } else {
        try {
          const tx = await router.configureRoute(
            sourceConfig.tokens.PYUSD,
            sourceConfig.chainId,
            destConfig.tokens.USDe,
            destConfig.chainId,
            {
              protocol: Protocol.LAYERZERO,
              protocolDomain: destConfig.lzChainId,
              bridgeContract: sourceConfig.protocolContracts.LAYERZERO_ENDPOINT,
              poolId: 0,
              swapPool: destConfig.swapPools.PYUSD_USDe, // DEX pool for PYUSD → USDe
              extraData: "0x"
            }
          );
          
          await tx.wait();
          console.log("✅ PYUSD → USDe cross-token route configured!");
          console.log("   LZ Chain ID:", destConfig.lzChainId);
          console.log("   Swap Pool:", destConfig.swapPools.PYUSD_USDe);
          routesConfigured++;
        } catch (error) {
          console.log("❌ Failed to configure:", error.message);
        }
      }
    }
    
    // Configure USDC → USDe cross-token route via CCTP V2 hooks
    if (sourceConfig.tokens.USDC && destConfig.tokens.USDe && destConfig.swapPools?.USDe_USDC) {
      console.log("Configuring USDC → USDe (CCTP V2 Hooks + DEX)...");
      
      const isConfigured = await router.isRouteConfigured(
        sourceConfig.tokens.USDC,
        sourceConfig.chainId,
        destConfig.tokens.USDe,
        destConfig.chainId
      );
      
      if (isConfigured) {
        console.log("✅ Already configured");
      } else {
        try {
          const tx = await router.configureRoute(
            sourceConfig.tokens.USDC,
            sourceConfig.chainId,
            destConfig.tokens.USDe,
            destConfig.chainId,
            {
              protocol: Protocol.CCTP_HOOKS,
              protocolDomain: destConfig.cctpDomain,
              bridgeContract: sourceConfig.protocolContracts.CCTP_TOKEN_MESSENGER,
              poolId: 0,
              swapPool: destConfig.swapPools.USDe_USDC, // DEX pool for USDC → USDe
              extraData: "0x"
            }
          );
          
          await tx.wait();
          console.log("✅ USDC → USDe cross-token route configured!");
          console.log("   CCTP Domain:", destConfig.cctpDomain);
          console.log("   Swap Pool:", destConfig.swapPools.USDe_USDC);
          routesConfigured++;
        } catch (error) {
          console.log("❌ Failed to configure:", error.message);
        }
      }
    }
    
    // Configure USDe → USDe route via LayerZero OFT
    if (sourceConfig.tokens.USDe && destConfig.tokens.USDe) {
      console.log("Configuring USDe → USDe (LayerZero OFT)...");
      
      const isConfigured = await router.isRouteConfigured(
        sourceConfig.tokens.USDe,
        sourceConfig.chainId,
        destConfig.tokens.USDe,
        destConfig.chainId
      );
      
      if (isConfigured) {
        console.log("✅ Already configured");
      } else {
        try {
          const tx = await router.configureRoute(
            sourceConfig.tokens.USDe,
            sourceConfig.chainId,
            destConfig.tokens.USDe,
            destConfig.chainId,
            {
              protocol: Protocol.LAYERZERO,
              protocolDomain: destConfig.lzChainId,
              bridgeContract: sourceConfig.protocolContracts.LAYERZERO_ENDPOINT,
              poolId: 0,
              swapPool: "0x0000000000000000000000000000000000000000", // No swap for same token
              extraData: "0x"
            }
          );
          
          await tx.wait();
          console.log("✅ USDe route configured via LayerZero");
          console.log("   LZ Chain ID:", destConfig.lzChainId);
          routesConfigured++;
        } catch (error) {
          console.log("❌ Failed to configure:", error.message);
        }
      }
    }
  }
  
  console.log("\n========================================");
  console.log(`✅ Configuration complete!`);
  console.log(`Routes configured: ${routesConfigured}`);
  console.log("========================================");
  
  // Save configuration status
  const configPath = `./deployments/${network}-routes-config.json`;
  const configInfo = {
    network: network,
    router: deployment.router,
    timestamp: new Date().toISOString(),
    routesConfigured: routesConfigured,
    sourceConfig: sourceConfig
  };
  
  fs.writeFileSync(configPath, JSON.stringify(configInfo, null, 2));
  console.log(`\n💾 Configuration saved to ${configPath}`);
}

async function main() {
  await configureRoutes();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
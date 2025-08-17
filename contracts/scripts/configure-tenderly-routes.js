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

// Mainnet configurations
const MAINNET_CONFIG = {
  ethereum: {
    chainId: 9923, // Tenderly fork chain ID
    cctpDomain: 0,
    lzChainId: 101,
    tokens: {
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      PYUSD: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
      USDe: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3"
    },
    protocols: {
      CCTP_TOKEN_MESSENGER: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
      CCTP_MESSAGE_TRANSMITTER: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
      LAYERZERO_ENDPOINT: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
      STARGATE_ROUTER: "0x8731d54E9D02c286767d56ac03e8037C07e01e98"
    },
    dexPools: {
      // Mainnet Uniswap V3 pools
      USDC_DAI: "0x5777d92f208679DB4b9778590Fa3CAB3aC9e2168",
      USDC_USDT: "0x3416cF6C708Da44DB2624D63ea0AAef7113527C6",
      DAI_USDT: "0x0000000000000000000000000000000000000000", // Add if needed
    }
  },
  base: {
    chainId: 84539, // Tenderly fork chain ID
    cctpDomain: 6,
    lzChainId: 184,
    tokens: {
      USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // Bridged USDC
      DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      PYUSD: "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    protocols: {
      CCTP_TOKEN_MESSENGER: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
      CCTP_MESSAGE_TRANSMITTER: "0xAD09780d193884d503182aD4588450C416D6F9D4",
      LAYERZERO_ENDPOINT: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
      STARGATE_ROUTER: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B"
    },
    dexPools: {
      // Base DEX pools (Aerodrome, BaseSwap, etc)
      USDC_DAI: "0x0000000000000000000000000000000000000000", // Add actual pool
      USDC_USDbC: "0x0000000000000000000000000000000000000000", // Add actual pool
    }
  },
  arbitrum: {
    chainId: 9924, // Tenderly fork chain ID
    cctpDomain: 3,
    lzChainId: 110,
    tokens: {
      USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Native USDC
      USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // Bridged USDC
      USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
    },
    protocols: {
      CCTP_TOKEN_MESSENGER: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
      CCTP_MESSAGE_TRANSMITTER: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
      LAYERZERO_ENDPOINT: "0x3c2269811836af69497E5F486A85D7316753cf62",
      STARGATE_ROUTER: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614"
    },
    dexPools: {
      // Arbitrum DEX pools (Uniswap V3, Camelot, etc)
      USDC_USDT: "0x0000000000000000000000000000000000000000", // Add actual pool
      USDC_DAI: "0x0000000000000000000000000000000000000000", // Add actual pool
    }
  }
};

function getNetworkConfig(network) {
  if (network === "tenderlyMainnet") return MAINNET_CONFIG.ethereum;
  if (network === "tenderlyBase") return MAINNET_CONFIG.base;
  if (network === "tenderlyArbitrum") return MAINNET_CONFIG.arbitrum;
  throw new Error(`Unknown network: ${network}`);
}

async function loadDeployment(network) {
  const chainName = network.replace("tenderly", "").toLowerCase();
  const deploymentPath = `./deployments/tenderly-${chainName}.json`;
  
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for ${network}. Run tenderly-deploy.js first.`);
  }
  
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function configureRoute(router, fromToken, fromChainId, toToken, toChainId, route) {
  try {
    // Check if already configured
    const isConfigured = await router.isRouteConfigured(
      fromToken,
      fromChainId,
      toToken,
      toChainId
    );
    
    if (isConfigured) {
      console.log(`  ✅ Already configured`);
      return false;
    }
    
    // Configure the route
    const tx = await router.configureRoute(
      fromToken,
      fromChainId,
      toToken,
      toChainId,
      route
    );
    
    await tx.wait();
    console.log(`  ✅ Route configured`);
    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
    return false;
  }
}

async function configureTenderlyRoutes() {
  const network = hre.network.name;
  const [owner] = await ethers.getSigners();
  
  console.log("============================================");
  console.log(`Configuring Routes on ${network}`);
  console.log("============================================\n");
  console.log("Owner:", owner.address);
  
  // Load deployment and config
  const deployment = await loadDeployment(network);
  const sourceConfig = getNetworkConfig(network);
  const router = await ethers.getContractAt("UnifiedRouter", deployment.contracts.UnifiedRouter);
  
  console.log("Router:", deployment.contracts.UnifiedRouter);
  console.log("\n📝 Configuring routes...\n");
  
  let routesConfigured = 0;
  
  // Configure routes to other Tenderly networks
  for (const [destNetwork, destConfig] of Object.entries(MAINNET_CONFIG)) {
    // Skip same network
    if ((network === "tenderlyMainnet" && destNetwork === "ethereum") ||
        (network === "tenderlyBase" && destNetwork === "base") ||
        (network === "tenderlyArbitrum" && destNetwork === "arbitrum")) {
      continue;
    }
    
    console.log(`\n🔗 Routes to ${destNetwork.toUpperCase()}`);
    console.log("─".repeat(40));
    
    // USDC -> USDC via CCTP (most common route)
    if (sourceConfig.tokens.USDC && destConfig.tokens.USDC) {
      console.log("USDC → USDC (CCTP)");
      const configured = await configureRoute(
        router,
        sourceConfig.tokens.USDC,
        sourceConfig.chainId,
        destConfig.tokens.USDC,
        destConfig.chainId,
        {
          protocol: Protocol.CCTP,
          protocolDomain: destConfig.cctpDomain,
          bridgeContract: sourceConfig.protocols.CCTP_TOKEN_MESSENGER,
          poolId: 0,
          swapPool: "0x0000000000000000000000000000000000000000",
          extraData: "0x"
        }
      );
      if (configured) routesConfigured++;
    }
    
    // USDT -> USDT via Stargate (if available)
    if (sourceConfig.tokens.USDT && destConfig.tokens.USDT && 
        sourceConfig.protocols.STARGATE_ROUTER !== "0x0000000000000000000000000000000000000000") {
      console.log("USDT → USDT (Stargate)");
      const configured = await configureRoute(
        router,
        sourceConfig.tokens.USDT,
        sourceConfig.chainId,
        destConfig.tokens.USDT,
        destConfig.chainId,
        {
          protocol: Protocol.STARGATE,
          protocolDomain: destConfig.lzChainId,
          bridgeContract: sourceConfig.protocols.STARGATE_ROUTER,
          poolId: 2, // USDT pool ID on Stargate
          swapPool: "0x0000000000000000000000000000000000000000",
          extraData: "0x"
        }
      );
      if (configured) routesConfigured++;
    }
    
    // Cross-token: USDC -> DAI via CCTP_HOOKS (if destination has swap pool)
    if (sourceConfig.tokens.USDC && destConfig.tokens.DAI && destConfig.dexPools.USDC_DAI) {
      console.log("USDC → DAI (CCTP V2 Hooks)");
      const configured = await configureRoute(
        router,
        sourceConfig.tokens.USDC,
        sourceConfig.chainId,
        destConfig.tokens.DAI,
        destConfig.chainId,
        {
          protocol: Protocol.CCTP_HOOKS,
          protocolDomain: destConfig.cctpDomain,
          bridgeContract: sourceConfig.protocols.CCTP_TOKEN_MESSENGER,
          poolId: 0,
          swapPool: destConfig.dexPools.USDC_DAI,
          extraData: "0x"
        }
      );
      if (configured) routesConfigured++;
    }
  }
  
  // Configure same-chain swap pools
  console.log("\n\n🔄 Configuring Same-Chain Swap Pools");
  console.log("─".repeat(40));
  
  if (sourceConfig.dexPools.USDC_DAI && sourceConfig.dexPools.USDC_DAI !== "0x0000000000000000000000000000000000000000") {
    console.log("USDC <-> DAI");
    try {
      const tx = await router.setSameChainSwapPool(
        sourceConfig.tokens.USDC,
        sourceConfig.tokens.DAI,
        sourceConfig.dexPools.USDC_DAI
      );
      await tx.wait();
      console.log("  ✅ Configured");
    } catch (error) {
      console.log(`  ⚠️  ${error.message}`);
    }
  }
  
  console.log("\n========================================");
  console.log(`✅ Configuration complete!`);
  console.log(`Routes configured: ${routesConfigured}`);
  console.log("========================================");
  
  // Save configuration
  const configPath = `./deployments/${network}-routes.json`;
  const configInfo = {
    network: network,
    router: deployment.contracts.UnifiedRouter,
    timestamp: new Date().toISOString(),
    routesConfigured: routesConfigured,
    config: sourceConfig
  };
  
  fs.writeFileSync(configPath, JSON.stringify(configInfo, null, 2));
  console.log(`\n💾 Configuration saved to ${configPath}`);
}

async function main() {
  await configureTenderlyRoutes();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
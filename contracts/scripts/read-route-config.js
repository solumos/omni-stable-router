const { ethers } = require("hardhat");
const { formatUnits } = require("ethers");

// Deployed RouteProcessor contracts
const ROUTE_PROCESSORS = {
  sepolia: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",  // RouteProcessor, not StableRouter
  baseSepolia: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
  arbitrumSepolia: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3"
};

// Known token addresses
const TOKENS = {
  sepolia: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    USDT: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
    PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"
  },
  baseSepolia: {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  arbitrumSepolia: {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  }
};

// Chain names and IDs
const CHAIN_INFO = {
  sepolia: { id: 11155111, name: "Sepolia", cctpDomain: 0, lzId: 10161 },
  baseSepolia: { id: 84532, name: "Base Sepolia", cctpDomain: 6, lzId: 10245 },
  arbitrumSepolia: { id: 421614, name: "Arbitrum Sepolia", cctpDomain: 3, lzId: 10231 }
};

async function getTokenInfo(tokenAddress, provider) {
  try {
    const token = new ethers.Contract(
      tokenAddress,
      ["function symbol() view returns (string)", "function name() view returns (string)", "function decimals() view returns (uint8)"],
      provider
    );
    const [symbol, name, decimals] = await Promise.all([
      token.symbol().catch(() => "Unknown"),
      token.name().catch(() => "Unknown Token"),
      token.decimals().catch(() => 18)
    ]);
    return { symbol, name, decimals };
  } catch (e) {
    return { symbol: "Unknown", name: "Unknown Token", decimals: 18 };
  }
}

async function readTokenConfig(routeProcessor, tokenAddress) {
  try {
    // Read token configuration from RouteProcessor
    const [isUSDC, oftAddress, stargatePoolId] = await Promise.all([
      routeProcessor.isUSDC(tokenAddress).catch(() => false),
      routeProcessor.tokenToOFT(tokenAddress).catch(() => ethers.ZeroAddress),
      routeProcessor.tokenToStargatePoolId(tokenAddress).catch(() => 0)
    ]);
    
    return {
      isConfigured: isUSDC || oftAddress !== ethers.ZeroAddress || stargatePoolId > 0,
      isUSDC,
      oftAddress: oftAddress !== ethers.ZeroAddress ? oftAddress : null,
      stargatePoolId: stargatePoolId > 0 ? stargatePoolId : null,
      protocol: isUSDC ? "CCTP" : oftAddress !== ethers.ZeroAddress ? "LayerZero OFT" : stargatePoolId > 0 ? "Stargate" : "Not Configured"
    };
  } catch (e) {
    console.error("Error reading token config:", e.message);
    return {
      isConfigured: false,
      protocol: "Error reading config"
    };
  }
}

async function readDestinationConfig(routeProcessor, destChainId, tokenAddress) {
  try {
    // For CCTP destinations
    const cctpHookReceiver = await routeProcessor.cctpHookReceivers(destChainId).catch(() => ethers.ZeroAddress);
    
    // For OFT destinations - using destinationOFTAddresses mapping
    const destOFTAddress = await routeProcessor.destinationOFTAddresses(destChainId, tokenAddress).catch(() => ethers.ZeroAddress);
    
    return {
      cctpHookReceiver: cctpHookReceiver !== ethers.ZeroAddress ? cctpHookReceiver : null,
      destOFTAddress: destOFTAddress !== ethers.ZeroAddress ? destOFTAddress : null
    };
  } catch (e) {
    return {
      cctpHookReceiver: null,
      destOFTAddress: null
    };
  }
}

async function displayRouteConfig(sourceChain, sourceToken, destChain, destToken) {
  console.log("\n🔍 Route Configuration Query");
  console.log("════════════════════════════════════════════");
  
  // Source chain info
  console.log("\n📍 Source:");
  console.log(`├── Chain: ${CHAIN_INFO[sourceChain].name} (${CHAIN_INFO[sourceChain].id})`);
  console.log(`├── Token: ${sourceToken}`);
  
  // Get RouteProcessor on source chain
  const routeProcessor = await ethers.getContractAt("RouteProcessor", ROUTE_PROCESSORS[sourceChain]);
  
  // Get token info
  const tokenInfo = await getTokenInfo(sourceToken, ethers.provider);
  console.log(`├── Symbol: ${tokenInfo.symbol}`);
  console.log(`└── Name: ${tokenInfo.name}`);
  
  // Read token configuration
  const tokenConfig = await readTokenConfig(routeProcessor, sourceToken);
  
  console.log("\n⚙️  Token Configuration:");
  console.log(`├── Protocol: ${tokenConfig.protocol}`);
  if (tokenConfig.isUSDC) {
    console.log(`├── USDC: ✅ (CCTP enabled)`);
    console.log(`└── CCTP Domain: ${CHAIN_INFO[sourceChain].cctpDomain}`);
  }
  if (tokenConfig.oftAddress) {
    console.log(`├── OFT Adapter: ${tokenConfig.oftAddress}`);
    console.log(`└── LayerZero Chain ID: ${CHAIN_INFO[sourceChain].lzId}`);
  }
  if (tokenConfig.stargatePoolId) {
    console.log(`└── Stargate Pool ID: ${tokenConfig.stargatePoolId}`);
  }
  
  // Destination chain info
  console.log("\n📍 Destination:");
  console.log(`├── Chain: ${CHAIN_INFO[destChain].name} (${CHAIN_INFO[destChain].id})`);
  console.log(`└── Token: ${destToken || "Same as source"}`);
  
  // Read destination configuration
  const destConfig = await readDestinationConfig(routeProcessor, CHAIN_INFO[destChain].id, sourceToken);
  
  console.log("\n🔗 Cross-Chain Configuration:");
  if (destConfig.cctpHookReceiver) {
    console.log(`├── CCTP Hook Receiver: ${destConfig.cctpHookReceiver}`);
    console.log(`├── CCTP Domain: ${CHAIN_INFO[destChain].cctpDomain}`);
  }
  if (destConfig.destOFTAddress) {
    console.log(`├── Destination OFT: ${destConfig.destOFTAddress}`);
    console.log(`├── LayerZero Chain ID: ${CHAIN_INFO[destChain].lzId}`);
  }
  
  // Determine route type
  console.log("\n🛣️  Route Analysis:");
  if (tokenConfig.isUSDC && destConfig.cctpHookReceiver) {
    console.log("✅ Direct CCTP Route Available");
    console.log("├── Protocol: Circle's Cross-Chain Transfer Protocol");
    console.log("├── Process: Burn on source → Mint on destination");
    console.log("├── Time: ~15 minutes");
    console.log("└── Slippage: 0% (1:1 transfer)");
  } else if (tokenConfig.oftAddress && destConfig.destOFTAddress) {
    console.log("✅ LayerZero OFT Route Available");
    console.log("├── Protocol: LayerZero Omnichain Fungible Token");
    console.log("├── Process: Lock/Burn on source → Mint on destination");
    console.log("├── Time: ~2-5 minutes");
    console.log("└── Requires: Gas on destination chain");
  } else if (tokenConfig.stargatePoolId) {
    console.log("✅ Stargate Route Available");
    console.log("├── Protocol: Stargate Bridge");
    console.log("├── Pool ID: " + tokenConfig.stargatePoolId);
    console.log("└── Time: ~1-2 minutes");
  } else {
    console.log("❌ No Direct Route Configured");
    console.log("└── This route may require manual configuration");
  }
}

async function displayAllRoutes() {
  const network = hre.network.name;
  console.log("\n📊 All Configured Routes from " + CHAIN_INFO[network].name);
  console.log("════════════════════════════════════════════\n");
  
  const routeProcessor = await ethers.getContractAt("RouteProcessor", ROUTE_PROCESSORS[network]);
  
  // Check all known tokens on this chain
  const tokens = TOKENS[network] || {};
  
  for (const [symbol, address] of Object.entries(tokens)) {
    console.log(`\n🪙 ${symbol} (${address})`);
    
    const tokenConfig = await readTokenConfig(routeProcessor, address);
    console.log(`Protocol: ${tokenConfig.protocol}`);
    
    if (tokenConfig.isConfigured) {
      // Check routes to other chains
      for (const destChain of Object.keys(CHAIN_INFO)) {
        if (destChain === network) continue;
        
        const destConfig = await readDestinationConfig(routeProcessor, CHAIN_INFO[destChain].id, address);
        
        if (destConfig.cctpHookReceiver || destConfig.destOFTAddress) {
          const routeType = tokenConfig.isUSDC ? "CCTP" : "OFT";
          console.log(`  → ${CHAIN_INFO[destChain].name}: ✅ ${routeType}`);
        } else {
          console.log(`  → ${CHAIN_INFO[destChain].name}: ❌ Not configured`);
        }
      }
    }
  }
  
  // Display contract addresses for reference
  console.log("\n📋 Contract Addresses:");
  console.log(`RouteProcessor: ${ROUTE_PROCESSORS[network]}`);
  
  // Get additional contract info
  try {
    const owner = await routeProcessor.owner().catch(() => "Unable to read");
    const paused = await routeProcessor.paused().catch(() => false);
    
    console.log(`Owner: ${owner}`);
    console.log(`Paused: ${paused ? "Yes" : "No"}`);
    
    // Check CCTP configuration
    const baseDomain = await routeProcessor.chainIdToCCTPDomain(84532).catch(() => 0);
    const arbitrumDomain = await routeProcessor.chainIdToCCTPDomain(421614).catch(() => 0);
    
    if (baseDomain > 0 || arbitrumDomain > 0) {
      console.log("CCTP Domains configured:");
      if (baseDomain > 0) console.log(`  Base Sepolia: Domain ${baseDomain}`);
      if (arbitrumDomain > 0) console.log(`  Arbitrum Sepolia: Domain ${arbitrumDomain}`);
    }
  } catch (e) {
    console.log("Error reading contract state:", e.message);
  }
}

async function main() {
  console.log("🌐 Cross-Chain Route Configuration Reader");
  console.log("=====================================");
  
  const network = hre.network.name;
  console.log("\nCurrent Network:", CHAIN_INFO[network]?.name || network);
  
  if (!ROUTE_PROCESSORS[network]) {
    console.log("❌ No RouteProcessor deployed on this network");
    return;
  }
  
  // Example: Read USDC route from current chain to others
  if (TOKENS[network]?.USDC) {
    console.log("\n" + "=".repeat(50));
    console.log("Example: USDC Routes from " + CHAIN_INFO[network].name);
    console.log("=".repeat(50));
    
    for (const destChain of Object.keys(CHAIN_INFO)) {
      if (destChain === network) continue;
      
      await displayRouteConfig(
        network,
        TOKENS[network].USDC,
        destChain,
        TOKENS[destChain]?.USDC
      );
    }
  }
  
  // Display all routes
  await displayAllRoutes();
  
  console.log("\n💡 Usage Tips:");
  console.log("• Run on different networks to see their configurations");
  console.log("• CCTP routes work for USDC only");
  console.log("• OFT routes require deployed OFT adapters on both chains");
  console.log("• Stargate routes require liquidity pools");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
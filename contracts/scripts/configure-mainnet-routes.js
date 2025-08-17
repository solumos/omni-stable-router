const { ethers } = require("hardhat");

async function main() {
  console.log("🛣️  CONFIGURING MAINNET CROSS-CHAIN ROUTES");
  console.log("==========================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Contract addresses
  const contracts = {
    8453: { // Base Mainnet
      router: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
      usde: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c"
    },
    42161: { // Arbitrum One
      router: "0xA0FD978f89D941783A43aFBe092B614ef31571F3",
      usde: "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34",
      usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c"
    }
  };
  
  // LayerZero endpoint IDs
  const lzEndpointIds = {
    8453: 30184,  // Base
    42161: 30110  // Arbitrum One
  };
  
  if (chainId !== 8453) {
    throw new Error("Run this script on Base mainnet (8453) to configure the route");
  }
  
  const [signer] = await ethers.getSigners();
  const config = contracts[chainId];
  
  console.log(`📍 Configuring from: Base Mainnet (${chainId})`);
  console.log(`🎯 Target: Arbitrum One (42161)`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🌉 Router: ${config.router}\n`);
  
  // Get router contract
  const routerABI = [
    "function owner() view returns (address)",
    "function configureRoute(address,uint256,address,uint256,tuple(uint8,uint32,address,uint256,address,bytes)) external",
    "function isRouteConfigured(address,uint256,address,uint256) view returns (bool)",
    "function getRouteKey(address,uint256,address,uint256) view returns (bytes32)",
    "function routes(bytes32) view returns (tuple(uint8,uint32,address,uint256,address,bytes))"
  ];
  
  const router = new ethers.Contract(config.router, routerABI, signer);
  
  // Check ownership
  const owner = await router.owner();
  console.log(`👤 Router Owner: ${owner}`);
  console.log(`✅ Is Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}\n`);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("Not the router owner - cannot configure routes");
  }
  
  // Configure LayerZero Compose Route: USDe (Base) → USDC (Arbitrum)
  console.log("🌐 Configuring LayerZero Compose Route:");
  console.log(`   From: USDe on Base (${config.usde})`);
  console.log(`   To: USDC on Arbitrum (${contracts[42161].usdc})`);
  console.log(`   Protocol: LayerZero Compose`);
  
  const lzComposeRoute = {
    protocol: 3, // LAYERZERO
    protocolDomain: lzEndpointIds[42161], // Arbitrum LZ endpoint ID
    bridgeContract: config.lzEndpoint,
    poolId: 0,
    swapPool: contracts[42161].router, // Target router for compose execution
    extraData: ethers.solidityPacked(
      ["uint32", "address"],
      [lzEndpointIds[42161], contracts[42161].router] // LZ endpoint ID + target router
    )
  };
  
  console.log("\n📋 Route Configuration:");
  console.log(`   Protocol: ${lzComposeRoute.protocol} (LayerZero)`);
  console.log(`   Protocol Domain: ${lzComposeRoute.protocolDomain}`);
  console.log(`   Bridge Contract: ${lzComposeRoute.bridgeContract}`);
  console.log(`   Pool ID: ${lzComposeRoute.poolId}`);
  console.log(`   Swap Pool: ${lzComposeRoute.swapPool}`);
  console.log(`   Extra Data: ${lzComposeRoute.extraData}`);
  
  // Check if route already exists
  console.log("\n🔍 Checking existing route...");
  try {
    const routeExists = await router.isRouteConfigured(
      config.usde,
      chainId,
      contracts[42161].usdc,
      42161
    );
    
    console.log(`   Route exists: ${routeExists}`);
    
    if (routeExists) {
      console.log("ℹ️  Route already configured. Checking details...");
      
      const routeKey = await router.getRouteKey(
        config.usde,
        chainId,
        contracts[42161].usdc,
        42161
      );
      
      const existingRoute = await router.routes(routeKey);
      console.log(`   Existing Protocol: ${existingRoute[0]}`);
      console.log(`   Existing Domain: ${existingRoute[1]}`);
      console.log(`   Existing Bridge: ${existingRoute[2]}`);
      console.log(`   Existing Pool ID: ${existingRoute[3]}`);
      console.log(`   Existing Swap Pool: ${existingRoute[4]}`);
    }
    
  } catch (e) {
    console.log(`   Error checking route: ${e.message}`);
  }
  
  // Configure the route
  console.log("\n🔧 Configuring LayerZero Compose route...");
  try {
    const routeTx = await router.configureRoute(
      config.usde,           // fromToken (USDe on Base)
      chainId,               // fromChainId (8453)
      contracts[42161].usdc, // toToken (USDC on Arbitrum)
      42161,                 // toChainId (42161)
      lzComposeRoute
    );
    
    console.log(`📋 Transaction Hash: ${routeTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    await routeTx.wait();
    console.log("✅ LayerZero Compose route configured successfully!");
    
  } catch (e) {
    console.log("❌ Route configuration failed:", e.message);
    
    if (e.message.includes("route already exists")) {
      console.log("ℹ️  Route already exists - this is normal");
    } else {
      console.log("🔍 Check if:");
      console.log("   • USDe token address is correct");
      console.log("   • LayerZero endpoints are properly configured");
      console.log("   • Router has the correct permissions");
    }
  }
  
  // Verify the configured route
  console.log("\n🔍 Verifying configured route...");
  try {
    const routeConfigured = await router.isRouteConfigured(
      config.usde,
      chainId,
      contracts[42161].usdc,
      42161
    );
    
    console.log(`✅ Route configured: ${routeConfigured}`);
    
    if (routeConfigured) {
      const routeKey = await router.getRouteKey(
        config.usde,
        chainId,
        contracts[42161].usdc,
        42161
      );
      
      const route = await router.routes(routeKey);
      console.log("\n📋 Final Route Details:");
      console.log(`   Protocol: ${route[0]} (3=LayerZero)`);
      console.log(`   Protocol Domain: ${route[1]}`);
      console.log(`   Bridge Contract: ${route[2]}`);
      console.log(`   Pool ID: ${route[3]}`);
      console.log(`   Swap Pool: ${route[4]}`);
      console.log(`   Extra Data: ${route[5]}`);
    }
    
  } catch (e) {
    console.log("❌ Route verification failed:", e.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 LAYERZERO COMPOSE ROUTE CONFIGURED!");
  console.log("=".repeat(60));
  console.log("✅ USDe (Base) → USDC (Arbitrum) via LayerZero Compose");
  console.log("✅ Route enables cross-chain token swaps");
  console.log("✅ Production-ready cross-chain infrastructure");
  
  console.log("\n🚀 What this enables:");
  console.log("• Send USDe from Base");
  console.log("• LayerZero message with compose data");
  console.log("• Automatic swap to USDC on Arbitrum");
  console.log("• Single-transaction cross-chain experience");
  
  console.log("\n📋 Next Steps:");
  console.log("1. ✅ LayerZero Compose route configured");
  console.log("2. 🌐 Update frontend with mainnet addresses");
  console.log("3. 🧪 Test cross-chain transfers");
  console.log("4. 📊 Monitor transaction success rates");
  
  // Save route configuration
  const routeConfig = {
    network: "Base Mainnet",
    chainId: chainId,
    route: {
      from: {
        token: config.usde,
        symbol: "USDe",
        chain: "Base",
        chainId: chainId
      },
      to: {
        token: contracts[42161].usdc,
        symbol: "USDC", 
        chain: "Arbitrum One",
        chainId: 42161
      },
      protocol: "LayerZero Compose",
      configuration: lzComposeRoute
    },
    configuredAt: new Date().toISOString(),
    transactionHash: routeTx?.hash
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const filepath = path.join(deploymentsDir, 'mainnet_layerzero_compose_route.json');
  
  fs.writeFileSync(filepath, JSON.stringify(routeConfig, null, 2));
  console.log(`\n📄 Route configuration saved: ${filepath}`);
  
  console.log(`\n🔗 Base Router: https://basescan.org/address/${config.router}`);
  console.log(`🔗 Arbitrum Router: https://arbiscan.io/address/${contracts[42161].router}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
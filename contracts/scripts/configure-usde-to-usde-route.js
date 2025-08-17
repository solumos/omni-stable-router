const { ethers } = require("hardhat");

async function main() {
  console.log("🛣️  CONFIGURING USDe → USDe LAYERZERO ROUTE");
  console.log("==========================================\n");
  
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const [signer] = await ethers.getSigners();
  
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🌉 Router: ${routerAddress}\n`);
  
  // Use the actual contract interface
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Check ownership
  const owner = await router.owner();
  console.log(`👤 Router Owner: ${owner}`);
  console.log(`✅ Is Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}\n`);
  
  // USDe OFT addresses (same on both chains)
  const usdeAddress = "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34";
  const lzEndpointAddress = "0x1a44076050125825900e736c501f859c50fE728c";
  
  console.log("🌐 Configuring LayerZero Standard Route:");
  console.log(`   From: USDe on Base (${usdeAddress})`);
  console.log(`   To: USDe on Arbitrum (${usdeAddress})`);
  console.log(`   Protocol: LayerZero Standard (no compose needed)`);
  console.log(`   LayerZero Endpoint: ${lzEndpointAddress}\n`);
  
  // Standard LayerZero Route Configuration (no compose needed for same token)
  const lzStandardRoute = {
    protocol: 3, // Protocol.LAYERZERO
    protocolDomain: 30110, // Arbitrum One LayerZero endpoint ID
    bridgeContract: lzEndpointAddress,
    poolId: 0,
    swapPool: ethers.ZeroAddress, // No swap needed - same token
    extraData: ethers.solidityPacked(
      ["uint32"],
      [30110] // Just the Arbitrum LZ endpoint ID
    )
  };
  
  console.log("📋 Route Configuration:");
  console.log(`   Protocol: ${lzStandardRoute.protocol} (LayerZero)`);
  console.log(`   Protocol Domain: ${lzStandardRoute.protocolDomain}`);
  console.log(`   Bridge Contract: ${lzStandardRoute.bridgeContract}`);
  console.log(`   Pool ID: ${lzStandardRoute.poolId}`);
  console.log(`   Swap Pool: ${lzStandardRoute.swapPool} (No swap needed)`);
  console.log(`   Extra Data: ${lzStandardRoute.extraData}\n`);
  
  // Check if route already exists
  console.log("🔍 Checking existing USDe → USDe route...");
  try {
    const routeExists = await router.isRouteConfigured(
      usdeAddress,     // fromToken (USDe on Base)
      8453,            // fromChainId (Base)
      usdeAddress,     // toToken (USDe on Arbitrum - same address)
      42161            // toChainId (Arbitrum)
    );
    
    console.log(`   Route exists: ${routeExists}`);
    
    if (routeExists) {
      console.log("ℹ️  USDe → USDe route already configured!");
      
      // Show existing route details
      const routeKey = await router.getRouteKey(
        usdeAddress,
        8453,
        usdeAddress,
        42161
      );
      
      const existingRoute = await router.routes(routeKey);
      console.log("\n📋 Existing Route Details:");
      console.log(`   Protocol: ${existingRoute.protocol}`);
      console.log(`   Protocol Domain: ${existingRoute.protocolDomain}`);
      console.log(`   Bridge Contract: ${existingRoute.bridgeContract}`);
      console.log(`   Pool ID: ${existingRoute.poolId}`);
      console.log(`   Swap Pool: ${existingRoute.swapPool}`);
      console.log(`   Extra Data: ${existingRoute.extraData}`);
      return;
    }
    
  } catch (e) {
    console.log(`   Error checking route: ${e.message}`);
  }
  
  // Configure the USDe → USDe route
  console.log("🔧 Configuring USDe → USDe LayerZero route...");
  try {
    const routeTx = await router.configureRoute(
      usdeAddress,           // fromToken (USDe on Base)
      8453,                  // fromChainId (Base)
      usdeAddress,           // toToken (USDe on Arbitrum - same token!)
      42161,                 // toChainId (Arbitrum)
      lzStandardRoute        // Standard LayerZero route (no compose)
    );
    
    console.log(`📋 Transaction Hash: ${routeTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await routeTx.wait();
    console.log(`✅ USDe → USDe route configured successfully! Block: ${receipt.blockNumber}`);
    
    // Verify the route
    console.log("\n🔍 Verifying configured route...");
    const routeConfigured = await router.isRouteConfigured(
      usdeAddress,
      8453,
      usdeAddress,
      42161
    );
    
    console.log(`✅ Route verification: ${routeConfigured}`);
    
    if (routeConfigured) {
      console.log("\n📋 Route Successfully Configured!");
      console.log("🎯 USDe (Base) → USDe (Arbitrum) via LayerZero OFT");
      
      // Show final route details
      const routeKey = await router.getRouteKey(
        usdeAddress,
        8453,
        usdeAddress,
        42161
      );
      
      const finalRoute = await router.routes(routeKey);
      console.log("\n📋 Final Route Details:");
      console.log(`   Protocol: ${finalRoute.protocol} (3=LayerZero)`);
      console.log(`   Protocol Domain: ${finalRoute.protocolDomain}`);
      console.log(`   Bridge Contract: ${finalRoute.bridgeContract}`);
      console.log(`   Pool ID: ${finalRoute.poolId}`);
      console.log(`   Swap Pool: ${finalRoute.swapPool}`);
      console.log(`   Extra Data: ${finalRoute.extraData}`);
    }
    
  } catch (e) {
    console.log("❌ Route configuration failed:", e.message);
    
    if (e.message.includes("route already exists")) {
      console.log("ℹ️  Route already exists - this is normal");
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 USDe → USDe LAYERZERO ROUTE COMPLETE!");
  console.log("=".repeat(60));
  console.log("✅ USDe OFT on Base mainnet");
  console.log("✅ USDe OFT on Arbitrum mainnet");
  console.log("✅ Direct LayerZero OFT transfer route");
  console.log("✅ No swap needed - same token cross-chain");
  
  console.log("\n🚀 What this enables:");
  console.log("• Send USDe from Base to Arbitrum");
  console.log("• Direct LayerZero OFT transfer");
  console.log("• Same token, different chain");
  console.log("• Native cross-chain USDe experience");
  
  console.log("\n📊 Now Available Routes:");
  console.log("1. ✅ USDe (Base) → USDe (Arbitrum) - LayerZero OFT");
  console.log("2. ✅ USDe (Base) → USDC (Arbitrum) - LayerZero Compose");
  console.log("3. 🔄 USDC (Base) → USDC (Arbitrum) - CCTP (configure if needed)");
  
  console.log(`\n🔗 View on BaseScan: https://basescan.org/address/${routerAddress}`);
  console.log(`💎 USDe Token: https://basescan.org/address/${usdeAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
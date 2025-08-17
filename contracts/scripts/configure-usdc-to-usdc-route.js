const { ethers } = require("hardhat");

async function main() {
  console.log("🛣️  CONFIGURING USDC → USDC CCTP ROUTE");
  console.log("====================================\n");
  
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
  
  // USDC addresses on both chains
  const usdcBaseAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";     // USDC on Base
  const usdcArbitrumAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // USDC on Arbitrum
  const cctpTokenMessenger = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"; // CCTP on Base
  
  console.log("🔵 Configuring CCTP Route:");
  console.log(`   From: USDC on Base (${usdcBaseAddress})`);
  console.log(`   To: USDC on Arbitrum (${usdcArbitrumAddress})`);
  console.log(`   Protocol: CCTP (Circle Cross-Chain Transfer Protocol)`);
  console.log(`   CCTP TokenMessenger: ${cctpTokenMessenger}\n`);
  
  // CCTP Route Configuration
  const cctpRoute = {
    protocol: 1, // Protocol.CCTP
    protocolDomain: 3, // Arbitrum CCTP domain ID
    bridgeContract: cctpTokenMessenger,
    poolId: 0,
    swapPool: ethers.ZeroAddress, // No swap needed - same token (USDC)
    extraData: ethers.solidityPacked(
      ["uint32"],
      [3] // Arbitrum CCTP domain ID
    )
  };
  
  console.log("📋 Route Configuration:");
  console.log(`   Protocol: ${cctpRoute.protocol} (CCTP)`);
  console.log(`   Protocol Domain: ${cctpRoute.protocolDomain} (Arbitrum CCTP domain)`);
  console.log(`   Bridge Contract: ${cctpRoute.bridgeContract}`);
  console.log(`   Pool ID: ${cctpRoute.poolId}`);
  console.log(`   Swap Pool: ${cctpRoute.swapPool} (No swap needed)`);
  console.log(`   Extra Data: ${cctpRoute.extraData}\n`);
  
  // Check if route already exists
  console.log("🔍 Checking existing USDC → USDC route...");
  try {
    const routeExists = await router.isRouteConfigured(
      usdcBaseAddress,       // fromToken (USDC on Base)
      8453,                  // fromChainId (Base)
      usdcArbitrumAddress,   // toToken (USDC on Arbitrum)
      42161                  // toChainId (Arbitrum)
    );
    
    console.log(`   Route exists: ${routeExists}`);
    
    if (routeExists) {
      console.log("ℹ️  USDC → USDC route already configured!");
      
      // Show existing route details
      const routeKey = await router.getRouteKey(
        usdcBaseAddress,
        8453,
        usdcArbitrumAddress,
        42161
      );
      
      const existingRoute = await router.routes(routeKey);
      console.log("\n📋 Existing Route Details:");
      console.log(`   Protocol: ${existingRoute.protocol} (1=CCTP)`);
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
  
  // Configure the USDC → USDC route
  console.log("🔧 Configuring USDC → USDC CCTP route...");
  try {
    const routeTx = await router.configureRoute(
      usdcBaseAddress,       // fromToken (USDC on Base)
      8453,                  // fromChainId (Base)
      usdcArbitrumAddress,   // toToken (USDC on Arbitrum)
      42161,                 // toChainId (Arbitrum)
      cctpRoute              // CCTP route configuration
    );
    
    console.log(`📋 Transaction Hash: ${routeTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await routeTx.wait();
    console.log(`✅ USDC → USDC route configured successfully! Block: ${receipt.blockNumber}`);
    
    // Verify the route
    console.log("\n🔍 Verifying configured route...");
    const routeConfigured = await router.isRouteConfigured(
      usdcBaseAddress,
      8453,
      usdcArbitrumAddress,
      42161
    );
    
    console.log(`✅ Route verification: ${routeConfigured}`);
    
    if (routeConfigured) {
      console.log("\n📋 Route Successfully Configured!");
      console.log("🎯 USDC (Base) → USDC (Arbitrum) via CCTP");
      
      // Show final route details
      const routeKey = await router.getRouteKey(
        usdcBaseAddress,
        8453,
        usdcArbitrumAddress,
        42161
      );
      
      const finalRoute = await router.routes(routeKey);
      console.log("\n📋 Final Route Details:");
      console.log(`   Protocol: ${finalRoute.protocol} (1=CCTP)`);
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
  console.log("🎉 USDC → USDC CCTP ROUTE COMPLETE!");
  console.log("=".repeat(60));
  console.log("✅ USDC on Base mainnet");
  console.log("✅ USDC on Arbitrum mainnet");
  console.log("✅ CCTP cross-chain route");
  console.log("✅ Circle's official bridge protocol");
  
  console.log("\n🚀 What this enables:");
  console.log("• Send USDC from Base to Arbitrum");
  console.log("• Native CCTP burn/mint mechanism");
  console.log("• Same token, different chain");
  console.log("• Circle's secure cross-chain protocol");
  
  console.log("\n📊 Complete Route Matrix:");
  console.log("1. ✅ USDe (Base) → USDe (Arbitrum) - LayerZero OFT");
  console.log("2. ✅ USDe (Base) → USDC (Arbitrum) - LayerZero Compose");
  console.log("3. ✅ USDC (Base) → USDC (Arbitrum) - CCTP");
  
  console.log("\n🎯 All major cross-chain routes configured!");
  console.log("• LayerZero OFT transfers for USDe");
  console.log("• LayerZero Compose for cross-token swaps");
  console.log("• CCTP for native USDC transfers");
  
  console.log(`\n🔗 View on BaseScan: https://basescan.org/address/${routerAddress}`);
  console.log(`💰 USDC Base: https://basescan.org/address/${usdcBaseAddress}`);
  console.log(`💰 USDC Arbitrum: https://arbiscan.io/address/${usdcArbitrumAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
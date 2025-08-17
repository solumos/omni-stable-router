const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 DEBUGGING LAYERZERO COMPOSE TRANSFER");
  console.log("======================================\n");
  
  const config = {
    router: "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be",
    usde: "0x76eedc9768cE1bA7632202a4B3aFAE05b9a89B24",
    targetChain: 421614,
    targetUsdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  };
  
  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", config.router);
  
  console.log("👤 User:", signer.address);
  console.log("📊 ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)));
  
  // Check the failed transaction
  console.log("\n🔍 Investigating Failed Transaction...");
  const failedTx = "0xb4fcdf6022a5bfd5b6228a16745a6e4f7aa6d064307b016e081e26238c30d06f";
  
  try {
    const receipt = await ethers.provider.getTransactionReceipt(failedTx);
    console.log("📋 Transaction Details:");
    console.log(`   Status: ${receipt.status} (0 = failed)`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Gas limit: ${receipt.gasLimit || 'N/A'}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Logs: ${receipt.logs.length}`);
  } catch (e) {
    console.log("⚠️  Could not fetch transaction details");
  }
  
  // Let's debug the route configuration
  console.log("\n🛣️  Route Debugging...");
  
  try {
    const routeKey = await router.getRouteKey(
      config.usde,
      84532,
      config.targetUsdc,
      config.targetChain
    );
    
    const route = await router.routes(routeKey);
    console.log("📋 Route Details:");
    console.log(`   Protocol: ${route.protocol}`);
    console.log(`   Protocol Domain: ${route.protocolDomain}`);
    console.log(`   Bridge Contract: ${route.bridgeContract}`);
    console.log(`   Pool ID: ${route.poolId}`);
    console.log(`   Swap Pool: ${route.swapPool}`);
    console.log(`   Extra Data: ${route.extraData}`);
    
    // Check if the route is using the right protocol
    if (route.protocol !== BigInt(3)) {
      console.log(`⚠️  Route protocol is ${route.protocol}, should be 3 (LayerZero)`);
    }
    
  } catch (e) {
    console.log("❌ Route debug failed:", e.message);
  }
  
  // Test with simpler transfer function
  console.log("\n🧪 Testing Simple Transfer Function...");
  
  const testAmount = ethers.parseUnits("1", 18); // 1 USDe
  
  try {
    // Test the simple transfer function instead
    const result = await router.transfer.staticCall(
      config.usde,
      config.targetUsdc,
      testAmount,
      config.targetChain,
      signer.address
    );
    
    console.log("✅ Simple transfer simulation successful");
    console.log("   Result:", result);
  } catch (e) {
    console.log("❌ Simple transfer simulation failed:", e.message);
    
    // Try to decode the error
    if (e.data) {
      try {
        const decoded = router.interface.parseError(e.data);
        console.log("🔍 Decoded error:", decoded);
      } catch (decodeErr) {
        console.log("🔍 Raw error data:", e.data);
      }
    }
  }
  
  // Check LayerZero endpoint configuration
  console.log("\n🌐 LayerZero Endpoint Check...");
  
  try {
    const lzContract = await router.protocolContracts(3); // LayerZero = 3
    console.log(`LayerZero endpoint: ${lzContract}`);
    
    if (lzContract === ethers.ZeroAddress) {
      console.log("❌ LayerZero endpoint not configured!");
    } else {
      console.log("✅ LayerZero endpoint configured");
      
      // Check if endpoint contract exists
      const code = await ethers.provider.getCode(lzContract);
      if (code === "0x") {
        console.log("❌ LayerZero endpoint has no code!");
      } else {
        console.log("✅ LayerZero endpoint has code");
      }
    }
  } catch (e) {
    console.log("❌ LayerZero check failed:", e.message);
  }
  
  // Suggest fixes
  console.log("\n💡 Potential Issues & Fixes:");
  console.log("1. Route might be configured with wrong protocol (should be LayerZero=3)");
  console.log("2. LayerZero endpoint might not be properly configured");
  console.log("3. Cross-chain message format might be incorrect");
  console.log("4. Target chain route might not exist");
  console.log("5. LayerZero fees might be required but not provided");
  
  console.log("\n🔧 Try these fixes:");
  console.log("1. Reconfigure route with correct LayerZero protocol");
  console.log("2. Test with basic transfer() function first");
  console.log("3. Ensure LayerZero endpoints are properly set");
  console.log("4. Add LayerZero fees to transaction value");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
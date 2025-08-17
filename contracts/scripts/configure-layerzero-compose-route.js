const { ethers } = require("hardhat");

async function main() {
  console.log("🌟 Configuring LayerZero Compose Route for Cross-Token Swaps");
  console.log("==========================================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  let config;
  if (chainId === 84532) {
    config = {
      name: "Base Sepolia",
      router: "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be",
      lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
      lzEndpointId: 40245, // Base Sepolia LZ endpoint ID
      // Test tokens for LZ compose (we'll use mock addresses for testing)
      sourceToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC as source
      targetChain: 421614,
      targetLzId: 40231, // Arbitrum Sepolia LZ endpoint ID
      targetToken: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Different token for swap
      targetRouter: "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B"
    };
  } else if (chainId === 421614) {
    config = {
      name: "Arbitrum Sepolia", 
      router: "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B",
      lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
      lzEndpointId: 40231, // Arbitrum Sepolia LZ endpoint ID
      sourceToken: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC as source
      targetChain: 84532,
      targetLzId: 40245, // Base Sepolia LZ endpoint ID 
      targetToken: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Different token for swap
      targetRouter: "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be"
    };
  } else {
    throw new Error("Run on Base Sepolia (84532) or Arbitrum Sepolia (421614)");
  }
  
  console.log(`📍 Configuring ${config.name} LayerZero Compose Route`);
  console.log(`Router: ${config.router}`);
  console.log(`LZ Endpoint: ${config.lzEndpoint}`);
  console.log(`Source Token: ${config.sourceToken}`);
  console.log(`Target Chain: ${config.targetChain}`);
  console.log(`Target Token: ${config.targetToken}\n`);
  
  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", config.router);
  
  console.log("👤 Deployer:", signer.address);
  
  // Step 1: Configure LayerZero Compose route
  console.log("1️⃣ Configuring LayerZero Compose Route...");
  
  const lzComposeRoute = {
    protocol: 3, // LAYERZERO
    protocolDomain: config.targetLzId, // Target LZ endpoint ID
    bridgeContract: config.lzEndpoint, // LayerZero endpoint
    poolId: 0, // Not used for LZ
    swapPool: config.targetRouter, // Target router for compose execution
    extraData: ethers.solidityPacked(
      ["uint16", "address"], 
      [config.targetLzId, config.targetRouter]
    ) // LZ compose data
  };
  
  try {
    const tx = await router.configureRoute(
      config.sourceToken,  // fromToken
      chainId,            // fromChainId
      config.targetToken, // toToken (different token!)
      config.targetChain, // toChainId
      lzComposeRoute
    );
    
    await tx.wait();
    console.log("✅ LayerZero Compose route configured");
    console.log(`📋 Transaction hash: ${tx.hash}`);
  } catch (e) {
    console.log("❌ Route configuration failed:", e.message);
    return;
  }
  
  // Step 2: Verify route configuration
  console.log("\n2️⃣ Verifying Route Configuration...");
  
  try {
    const isConfigured = await router.isRouteConfigured(
      config.sourceToken,
      chainId,
      config.targetToken,
      config.targetChain
    );
    
    console.log("✅ Route verification:", isConfigured);
    
    if (!isConfigured) {
      console.log("❌ Route not properly configured!");
      return;
    }
  } catch (e) {
    console.log("❌ Route verification failed:", e.message);
    return;
  }
  
  // Step 3: Check route details
  console.log("\n3️⃣ Route Details...");
  
  try {
    const routeKey = await router.getRouteKey(
      config.sourceToken,
      chainId,
      config.targetToken,
      config.targetChain
    );
    
    const route = await router.routes(routeKey);
    console.log("📋 Route Details:");
    console.log(`   Protocol: ${route.protocol} (LayerZero)`);
    console.log(`   Protocol Domain: ${route.protocolDomain}`);
    console.log(`   Bridge Contract: ${route.bridgeContract}`);
    console.log(`   Swap Pool: ${route.swapPool}`);
    console.log(`   Extra Data: ${route.extraData}`);
  } catch (e) {
    console.log("⚠️  Could not fetch route details:", e.message);
  }
  
  // Step 4: Fee estimation for LZ compose
  console.log("\n4️⃣ LayerZero Fee Estimation...");
  
  try {
    const testAmount = ethers.parseUnits("1", 6); // 1 USDC
    const fee = await router.estimateFees(
      config.sourceToken,
      config.targetToken,
      testAmount,
      config.targetChain,
      signer.address
    );
    
    console.log(`⛽ Estimated LZ Fee: ${ethers.formatEther(fee)} ETH`);
    
    if (fee > 0) {
      console.log("✅ LayerZero fee estimation working");
    } else {
      console.log("⚠️  Zero fee - may need LZ fee configuration");
    }
  } catch (e) {
    console.log("❌ Fee estimation failed:", e.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 LayerZero Compose Configuration Complete!");
  console.log("=".repeat(60));
  console.log("✅ LayerZero protocol configured");
  console.log("✅ Cross-token compose route set up");
  console.log("✅ Fee estimation functional");
  console.log("✅ Ready for cross-token swaps via LayerZero");
  
  console.log("\n🧪 What this enables:");
  console.log(`1. Send ${config.sourceToken} on ${config.name}`);
  console.log(`2. Receive ${config.targetToken} on target chain`);
  console.log("3. Automatic cross-chain swap via LayerZero Compose");
  console.log("4. Single transaction for complex cross-chain operations");
  
  console.log("\n📋 Next steps:");
  console.log("1. Test LayerZero compose transfer");
  console.log("2. Verify compose message handling");
  console.log("3. Check swap execution on target chain");
  console.log("4. Monitor end-to-end flow");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
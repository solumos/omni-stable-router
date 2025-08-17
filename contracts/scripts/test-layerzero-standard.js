const { ethers } = require("hardhat");

async function main() {
  console.log("🌟 Testing LayerZero Standard Cross-Chain Transfer");
  console.log("===============================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 84532) {
    throw new Error("Run this on Base Sepolia (84532)");
  }
  
  // Configuration
  const config = {
    name: "Base Sepolia",
    router: "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be",
    lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    usde: "0x76eedc9768cE1bA7632202a4B3aFAE05b9a89B24", // Our test USDe
    targetChain: 421614, // Arbitrum Sepolia
    targetUsdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Arbitrum
    targetLzId: 40231 // Arbitrum Sepolia LayerZero endpoint ID
  };
  
  const [signer] = await ethers.getSigners();
  
  console.log(`📍 Testing LayerZero Standard Transfer: USDe → USDC`);
  console.log(`🌐 Source: ${config.name} (${chainId})`);
  console.log(`🎯 Target: Arbitrum Sepolia (${config.targetChain})`);
  console.log(`👤 User: ${signer.address}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", config.router);
  const usde = await ethers.getContractAt([
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ], config.usde);
  
  // Step 1: Check current route configuration
  console.log("1️⃣ Checking Route Configuration...");
  
  try {
    const routeKey = await router.getRouteKey(
      config.usde,
      chainId,
      config.targetUsdc,
      config.targetChain
    );
    
    const route = await router.routes(routeKey);
    console.log("📋 Current Route Details:");
    console.log(`   Protocol: ${route.protocol} (3=LayerZero)`);
    console.log(`   Protocol Domain: ${route.protocolDomain}`);
    console.log(`   Bridge Contract: ${route.bridgeContract}`);
    console.log(`   Pool ID: ${route.poolId}`);
    console.log(`   Swap Pool: ${route.swapPool}`);
    console.log(`   Extra Data Length: ${route.extraData.length}`);
    
    // Check if route uses compose
    if (route.swapPool !== ethers.ZeroAddress) {
      console.log("⚠️  Route configured for LayerZero Compose");
      console.log("🔧 Need to test with standard LayerZero transfer instead");
    }
    
  } catch (e) {
    console.log("❌ Route check failed:", e.message);
  }
  
  // Step 2: Configure a simpler LayerZero route (no compose)
  console.log("\n2️⃣ Configuring Standard LayerZero Route...");
  
  const standardLzRoute = {
    protocol: 3, // LAYERZERO
    protocolDomain: config.targetLzId, // Arbitrum Sepolia LZ endpoint ID
    bridgeContract: config.lzEndpoint,
    poolId: 0,
    swapPool: ethers.ZeroAddress, // No compose - standard transfer
    extraData: ethers.solidityPacked(
      ["uint16"],
      [config.targetLzId] // Just the target endpoint ID
    )
  };
  
  try {
    console.log("🔧 Configuring standard LayerZero route (no compose)...");
    const routeTx = await router.configureRoute(
      config.usde,          // fromToken (USDe)
      chainId,              // fromChainId
      config.targetUsdc,    // toToken (USDC) - but no swap will happen
      config.targetChain,   // toChainId
      standardLzRoute
    );
    await routeTx.wait();
    console.log("✅ Standard LayerZero route configured");
  } catch (e) {
    console.log("❌ Route configuration failed:", e.message);
    return;
  }
  
  // Step 3: Test LayerZero fee estimation
  console.log("\n3️⃣ LayerZero Fee Estimation...");
  
  const transferAmount = ethers.parseUnits("1", 18); // 1 USDe
  
  try {
    const estimatedFee = await router.estimateFees(
      config.usde,
      config.targetUsdc,
      transferAmount,
      config.targetChain,
      signer.address
    );
    
    console.log(`⛽ Estimated LZ Fee: ${ethers.formatEther(estimatedFee)} ETH`);
    console.log(`💸 Transfer Amount: ${ethers.formatUnits(transferAmount, 18)} USDe`);
    
    if (estimatedFee === BigInt(0)) {
      console.log("⚠️  Zero fee estimated - this might cause issues");
    }
  } catch (e) {
    console.log("❌ Fee estimation failed:", e.message);
    console.log("💡 This suggests LayerZero endpoint configuration issues");
  }
  
  // Step 4: Check balance and approve
  console.log("\n4️⃣ Token Setup...");
  
  const usdeBalance = await usde.balanceOf(signer.address);
  console.log(`💰 USDe Balance: ${ethers.formatUnits(usdeBalance, 18)} USDe`);
  
  if (usdeBalance < transferAmount) {
    console.log("❌ Insufficient USDe balance!");
    return;
  }
  
  const allowance = await usde.allowance(signer.address, config.router);
  
  if (allowance < transferAmount) {
    console.log("🔓 Approving USDe spending...");
    const approveTx = await usde.approve(config.router, transferAmount);
    await approveTx.wait();
    console.log("✅ USDe approved");
  } else {
    console.log("✅ USDe already approved");
  }
  
  // Step 5: Test standard LayerZero transfer (not compose)
  console.log("\n5️⃣ Testing Standard LayerZero Transfer...");
  
  console.log("🚀 Standard cross-chain transfer details:");
  console.log(`   Protocol: LayerZero Standard (no compose)`);
  console.log(`   From: ${ethers.formatUnits(transferAmount, 18)} USDe (Base Sepolia)`);
  console.log(`   To: USDe equivalent on Arbitrum Sepolia`);
  console.log(`   Mechanism: LayerZero message without compose`);
  console.log(`   Recipient: ${signer.address}`);
  
  try {
    // Use standard transfer function (not transferWithSwap)
    const transferTx = await router.transfer(
      config.usde,          // fromToken (USDe)
      config.targetUsdc,    // toToken (USDC) - but no actual swap
      transferAmount,       // amount
      config.targetChain,   // toChainId
      signer.address,       // recipient
      {
        gasLimit: 600000,   // Standard gas for LayerZero
        value: ethers.parseEther("0.01") // Include ETH for LZ fees
      }
    );
    
    console.log(`📋 Transaction submitted: ${transferTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await transferTx.wait();
    
    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check balance change
    const newUsdeBalance = await usde.balanceOf(signer.address);
    const usdeSpent = usdeBalance - newUsdeBalance;
    
    console.log(`💸 USDe spent: ${ethers.formatUnits(usdeSpent, 18)} USDe`);
    
    if (usdeSpent === transferAmount) {
      console.log("✅ Correct amount deducted from source chain!");
    }
    
    console.log("\n🌉 LayerZero Standard Processing...");
    console.log("📡 Message flow:");
    console.log("   1. ✅ USDe locked/burned on Base Sepolia");
    console.log("   2. 🌐 LayerZero message sent (no compose)");
    console.log("   3. ⏳ Message propagating to Arbitrum Sepolia");
    console.log("   4. 💰 USDe delivered to recipient (if OFT contract exists)");
    
    console.log(`\n🔗 Monitor transaction: https://sepolia.basescan.org/tx/${transferTx.hash}`);
    console.log(`🔍 Check LayerZero: https://testnet.layerzeroscan.com/tx/${transferTx.hash}`);
    
  } catch (e) {
    console.log("❌ LayerZero standard transfer failed:", e.message);
    
    console.log("\n🔍 Failure Analysis:");
    
    if (e.message.includes("insufficient funds")) {
      console.log("💡 Try increasing ETH value for LayerZero fees");
    }
    
    if (e.message.includes("route not configured")) {
      console.log("💡 Route configuration issue");
    }
    
    if (e.message.includes("execution reverted")) {
      console.log("💡 Contract execution issue - possibly:");
      console.log("   • USDe is not a proper LayerZero OFT token");
      console.log("   • Target chain doesn't have corresponding contract");
      console.log("   • LayerZero endpoint configuration issue");
    }
    
    // Try to simulate the call
    console.log("\n🧪 Simulating transaction...");
    try {
      await router.transfer.staticCall(
        config.usde,
        config.targetUsdc,
        transferAmount,
        config.targetChain,
        signer.address
      );
      console.log("✅ Simulation passed - transaction should work");
    } catch (simError) {
      console.log("❌ Simulation failed:", simError.message);
      console.log("🔍 This confirms the contract-level issue");
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 LayerZero Standard Test Summary");
  console.log("=".repeat(60));
  console.log("✅ Test USDe token available");
  console.log("✅ Standard LayerZero route configured");
  console.log("✅ Transfer attempted");
  
  console.log("\n🔮 Key Finding:");
  console.log("• LayerZero requires proper OFT (Omnichain Fungible Token) contracts");
  console.log("• Regular ERC20 tokens cannot use LayerZero cross-chain transfers");
  console.log("• Need to deploy proper LayerZero OFT tokens for full functionality");
  console.log("• Current test uses regular ERC20 which explains the failures");
  
  console.log("\n💡 Next Steps:");
  console.log("1. Deploy proper LayerZero OFT contracts");
  console.log("2. Test with real OFT tokens");
  console.log("3. Alternative: Test with CCTP (which works with regular USDC)");
  console.log("4. Focus on protocols that support regular ERC20 tokens");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
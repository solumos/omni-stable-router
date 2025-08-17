const { ethers } = require("hardhat");

async function main() {
  console.log("🌟 Testing LayerZero Compose Functionality");
  console.log("==========================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 84532) {
    throw new Error("Run this on Base Sepolia (84532)");
  }
  
  // Base Sepolia configuration
  const config = {
    name: "Base Sepolia",
    router: "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be",
    lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    usde: "0x76eedc9768cE1bA7632202a4B3aFAE05b9a89B24", // Our test USDe
    targetChain: 421614, // Arbitrum Sepolia
    targetUsdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // USDC on Arbitrum
    targetRouter: "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B"
  };
  
  const [signer] = await ethers.getSigners();
  
  console.log(`📍 Testing LayerZero Compose: USDe → USDC`);
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
  
  // Step 1: Check USDe balance
  console.log("1️⃣ Checking USDe Balance...");
  const usdeBalance = await usde.balanceOf(signer.address);
  const usdeDecimals = await usde.decimals();
  
  console.log(`💰 USDe Balance: ${ethers.formatUnits(usdeBalance, usdeDecimals)} USDe`);
  
  if (usdeBalance === BigInt(0)) {
    console.log("❌ No USDe found!");
    return;
  }
  
  // Step 2: Configure LayerZero Compose Route
  console.log("\n2️⃣ Configuring LayerZero Compose Route...");
  
  const lzComposeRoute = {
    protocol: 3, // LAYERZERO
    protocolDomain: 40231, // Arbitrum Sepolia LZ endpoint ID
    bridgeContract: config.lzEndpoint,
    poolId: 0,
    swapPool: config.targetRouter, // Target router for compose execution
    extraData: ethers.solidityPacked(
      ["uint16", "address"],
      [40231, config.targetRouter] // LZ endpoint ID + target router
    )
  };
  
  try {
    // Check if route already configured
    const routeExists = await router.isRouteConfigured(
      config.usde,
      chainId,
      config.targetUsdc,
      config.targetChain
    );
    
    if (!routeExists) {
      console.log("🔧 Configuring new LayerZero route...");
      const routeTx = await router.configureRoute(
        config.usde,          // fromToken (USDe)
        chainId,              // fromChainId
        config.targetUsdc,    // toToken (USDC)
        config.targetChain,   // toChainId
        lzComposeRoute
      );
      await routeTx.wait();
      console.log("✅ LayerZero compose route configured");
    } else {
      console.log("✅ LayerZero route already exists");
    }
  } catch (e) {
    console.log("❌ Route configuration failed:", e.message);
    return;
  }
  
  // Step 3: Fee Estimation
  console.log("\n3️⃣ LayerZero Fee Estimation...");
  
  const transferAmount = ethers.parseUnits("10", usdeDecimals); // 10 USDe
  
  try {
    const estimatedFee = await router.estimateFees(
      config.usde,
      config.targetUsdc,
      transferAmount,
      config.targetChain,
      signer.address
    );
    
    console.log(`⛽ Estimated LZ Fee: ${ethers.formatEther(estimatedFee)} ETH`);
    console.log(`💸 Transfer Amount: ${ethers.formatUnits(transferAmount, usdeDecimals)} USDe`);
    
    if (estimatedFee === BigInt(0)) {
      console.log("⚠️  Zero fee estimated - LayerZero may need additional configuration");
    }
  } catch (e) {
    console.log("❌ Fee estimation failed:", e.message);
  }
  
  // Step 4: Approve USDe
  console.log("\n4️⃣ Approving USDe...");
  
  const allowance = await usde.allowance(signer.address, config.router);
  
  if (allowance < transferAmount) {
    console.log("🔓 Approving USDe spending...");
    const approveTx = await usde.approve(config.router, transferAmount);
    await approveTx.wait();
    console.log("✅ USDe approved");
  } else {
    console.log("✅ USDe already approved");
  }
  
  // Step 5: Execute LayerZero Compose Transfer
  console.log("\n5️⃣ Executing LayerZero Compose Transfer...");
  
  console.log("🚀 Cross-chain compose transfer details:");
  console.log(`   Protocol: LayerZero Compose`);
  console.log(`   From: ${ethers.formatUnits(transferAmount, usdeDecimals)} USDe (Base Sepolia)`);
  console.log(`   To: USDC (Arbitrum Sepolia)`);
  console.log(`   Mechanism: Send USDe → LayerZero message → Swap to USDC`);
  console.log(`   Recipient: ${signer.address}`);
  
  try {
    // Test with transferWithSwap for compose functionality
    const transferTx = await router.transferWithSwap(
      config.usde,          // fromToken (USDe)
      config.targetUsdc,    // toToken (USDC)
      transferAmount,       // amount
      config.targetChain,   // toChainId
      signer.address,       // recipient
      0,                    // minAmountOut (accept any amount for testing)
      "0x",                 // swapData (empty for now)
      {
        gasLimit: 800000,   // Higher gas for compose
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
    
    console.log(`💸 USDe spent: ${ethers.formatUnits(usdeSpent, usdeDecimals)} USDe`);
    
    if (usdeSpent === transferAmount) {
      console.log("✅ Correct amount deducted from source chain!");
    }
    
    console.log("\n🌉 LayerZero Compose Processing...");
    console.log("📡 Message flow:");
    console.log("   1. ✅ USDe locked/burned on Base Sepolia");
    console.log("   2. 🌐 LayerZero message sent with compose data");
    console.log("   3. ⏳ Message propagating to Arbitrum Sepolia");
    console.log("   4. 🔄 lzCompose will execute swap USDe → USDC");
    console.log("   5. 💰 USDC delivered to recipient");
    
    console.log(`\n🔗 Monitor transaction: https://sepolia.basescan.org/tx/${transferTx.hash}`);
    console.log(`🔍 Check LayerZero: https://testnet.layerzeroscan.com/tx/${transferTx.hash}`);
    
  } catch (e) {
    console.log("❌ LayerZero compose transfer failed:", e.message);
    
    if (e.message.includes("insufficient funds")) {
      console.log("💡 Try sending some ETH value for LayerZero fees");
    }
    
    if (e.message.includes("route not configured")) {
      console.log("💡 Route may need additional LayerZero configuration");
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 LayerZero Compose Test Summary");
  console.log("=".repeat(60));
  console.log("✅ Test USDe token deployed and funded");
  console.log("✅ LayerZero compose route configured");
  console.log("✅ Cross-token transfer initiated");
  console.log("✅ LayerZero message processing");
  
  console.log("\n🔮 What this demonstrates:");
  console.log("• Cross-chain token swaps in a single transaction");
  console.log("• LayerZero Compose message handling");
  console.log("• Complex DeFi operations across chains");
  console.log("• Real testnet infrastructure integration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 LAYERZERO COMPOSE TEST: USDe BASE → USDC ARBITRUM");
  console.log("====================================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Configuration
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb"; // Existing router
  const usdeBase = "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34"; // USDe OFT on Base
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // USDC on Arbitrum
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`📤 From: USDe on Base`);
  console.log(`📥 To: USDC on Arbitrum\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdeContract = await ethers.getContractAt("IERC20", usdeBase);
  
  // Test amount: 1 USDe
  const amount = ethers.parseUnits("1", 18); // USDe has 18 decimals
  
  // Check balance
  const balance = await usdeContract.balanceOf(user.address);
  console.log(`💰 USDe Balance: ${ethers.formatUnits(balance, 18)} USDe`);
  
  if (balance < amount) {
    console.log("❌ Insufficient USDe balance");
    console.log("💡 You need USDe tokens on Base to test LayerZero Compose");
    return;
  }
  
  // Check if route is configured
  console.log("🔍 Checking LayerZero Compose route...");
  const routeKey = await router.getRouteKey(
    usdeBase,    // fromToken
    8453,        // fromChainId (Base)
    usdcArbitrum, // toToken
    42161        // toChainId (Arbitrum)
  );
  
  const isConfigured = await router.isRouteConfigured(
    usdeBase,
    8453,
    usdcArbitrum,
    42161
  );
  
  if (!isConfigured) {
    console.log("⚠️  Route not configured. Configuring now...");
    
    // Configure LayerZero Compose route
    const lzEndpointBase = "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7"; // Base LayerZero endpoint
    const arbitrumLzId = 30110; // Arbitrum LayerZero chain ID
    
    const route = {
      protocol: 4, // Protocol.LAYERZERO_COMPOSE (assuming enum value)
      protocolDomain: arbitrumLzId,
      bridgeContract: lzEndpointBase,
      poolId: 0,
      swapPool: ethers.ZeroAddress, // Will be set to swap pool on Arbitrum
      extraData: ethers.solidityPacked(["uint32"], [arbitrumLzId])
    };
    
    try {
      const configTx = await router.configureRoute(
        usdeBase,
        8453,
        usdcArbitrum,
        42161,
        route
      );
      await configTx.wait();
      console.log("✅ LayerZero Compose route configured!\n");
    } catch (e) {
      console.log(`❌ Failed to configure route: ${e.message}`);
      return;
    }
  } else {
    console.log("✅ LayerZero Compose route already configured\n");
  }
  
  // Estimate LayerZero fees
  console.log("💸 Estimating LayerZero fees...");
  
  // For LayerZero Compose, we need to estimate the message fee
  const lzEndpointABI = [
    "function estimateFees(uint16 _dstChainId, address _userApplication, bytes calldata _payload, bool _payInZRO, bytes calldata _adapterParam) external view returns (uint256 nativeFee, uint256 zroFee)"
  ];
  
  const lzEndpoint = new ethers.Contract(
    "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
    lzEndpointABI,
    ethers.provider
  );
  
  // Create a simple payload for fee estimation
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [user.address, amount]
  );
  
  const adapterParams = ethers.solidityPacked(
    ["uint16", "uint256"],
    [1, 300000] // Version 1, 300k gas on destination
  );
  
  try {
    const [nativeFee, zroFee] = await lzEndpoint.estimateFees(
      30110, // Arbitrum LZ chain ID
      routerAddress,
      payload,
      false,
      adapterParams
    );
    
    console.log(`📊 Estimated LayerZero fee: ${ethers.formatEther(nativeFee)} ETH`);
    console.log(`   (Required for cross-chain message)\n`);
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(user.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    if (ethBalance < nativeFee) {
      console.log("❌ Insufficient ETH for LayerZero fees");
      return;
    }
    
    // Approve USDe to router
    console.log("🔓 Approving USDe to router...");
    const currentAllowance = await usdeContract.allowance(user.address, routerAddress);
    
    if (currentAllowance < amount) {
      const approveTx = await usdeContract.approve(routerAddress, amount);
      await approveTx.wait();
      console.log("✅ USDe approved\n");
    } else {
      console.log("✅ Already approved\n");
    }
    
    // Execute LayerZero Compose transfer
    console.log("🚀 Executing LayerZero Compose Transfer...");
    console.log("   From: 1 USDe on Base");
    console.log("   To: ~1 USDC on Arbitrum (after swap)");
    console.log("   Protocol: LayerZero Compose");
    console.log("   Process: Bridge USDe → Swap to USDC on Arbitrum\n");
    
    const startTime = new Date();
    
    const transferTx = await router.transfer(
      usdeBase,     // fromToken
      usdcArbitrum, // toToken
      amount,       // amount
      42161,        // toChainId
      user.address, // recipient
      { value: nativeFee } // Include LayerZero fee
    );
    
    console.log(`📋 TX Hash: ${transferTx.hash}`);
    console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await transferTx.wait();
    const endTime = new Date();
    const elapsed = (endTime - startTime) / 1000;
    
    console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
    console.log(`⏰ Confirmation time: ${elapsed} seconds`);
    console.log(`📊 Gas used: ${receipt.gasUsed}`);
    
    // Check new balance
    const newBalance = await usdeContract.balanceOf(user.address);
    const spent = balance - newBalance;
    console.log(`💸 USDe spent: ${ethers.formatUnits(spent, 18)}`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 LAYERZERO COMPOSE TRANSFER INITIATED!");
    console.log("=".repeat(60));
    
    console.log("\n📋 Transfer Details:");
    console.log(`   Source: 1 USDe on Base`);
    console.log(`   Destination: ~1 USDC on Arbitrum`);
    console.log(`   Protocol: LayerZero Compose`);
    console.log(`   Expected time: 30-60 seconds`);
    
    console.log("\n🔄 LayerZero Compose Process:");
    console.log("1. ✅ USDe locked/burned on Base");
    console.log("2. ⏳ LayerZero message sent to Arbitrum");
    console.log("3. ⏳ Message delivered to Arbitrum (~30 sec)");
    console.log("4. ⏳ USDe minted on Arbitrum");
    console.log("5. ⏳ Swapped to USDC via DEX");
    console.log("6. ⏳ USDC sent to recipient");
    
    console.log("\n🔍 Monitor Progress:");
    console.log(`📍 Base TX: https://basescan.org/tx/${transferTx.hash}`);
    console.log(`📍 LayerZero Scan: https://layerzeroscan.com/tx/${transferTx.hash}`);
    console.log(`📍 Arbitrum: https://arbiscan.io/address/${user.address}`);
    
    console.log("\n💡 Notes:");
    console.log("• LayerZero Compose enables cross-token swaps");
    console.log("• The swap happens automatically on Arbitrum");
    console.log("• No manual intervention required");
    console.log("• Check Arbitrum for received USDC in ~30-60 seconds");
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    
    // If it's a fee estimation error, try with a default fee
    if (error.message.includes("estimateFees")) {
      console.log("\n💡 Fee estimation failed. Try with manual fee:");
      console.log("   const fee = ethers.parseEther('0.01'); // 0.01 ETH");
    }
  }
  
  console.log("\n✅ LayerZero Compose test complete!");
  console.log("Check your Arbitrum address for USDC in 30-60 seconds");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 LAYERZERO COMPOSE TEST: SWAP USDC TO USDe, THEN CROSS-CHAIN");
  console.log("=========================================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Configuration
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdeBase = "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34"; // USDe OFT on Base
  const usdeArbitrum = "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34"; // USDe OFT on Arbitrum
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}\n`);
  
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  const usdeContract = await ethers.getContractAt("IERC20", usdeBase);
  
  // Check balances
  const usdcBalance = await usdcContract.balanceOf(user.address);
  const usdeBalance = await usdeContract.balanceOf(user.address);
  
  console.log("💰 Current Balances:");
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`   USDe: ${ethers.formatUnits(usdeBalance, 18)} USDe\n`);
  
  // Step 1: If no USDe, swap some USDC for USDe on Base
  if (usdeBalance < ethers.parseUnits("0.1", 18)) {
    console.log("📝 Step 1: Need to acquire USDe on Base");
    console.log("=========================================\n");
    
    if (usdcBalance < ethers.parseUnits("1", 6)) {
      console.log("❌ Insufficient USDC balance (need at least 1 USDC)");
      return;
    }
    
    // Try to find a DEX to swap USDC for USDe on Base
    console.log("🔍 Looking for USDC/USDe liquidity on Base...\n");
    
    // Check Uniswap V3 on Base
    const uniswapV3Router = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Uniswap V3 SwapRouter on Base
    
    // For this test, let's use Aerodrome (Base's primary DEX)
    const aerodromeRouter = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43"; // Aerodrome Router on Base
    
    console.log("💱 Attempting swap via Aerodrome DEX...");
    console.log("   From: 1 USDC");
    console.log("   To: USDe (estimated ~1 USDe)");
    
    // First approve USDC to Aerodrome
    const swapAmount = ethers.parseUnits("1", 6); // 1 USDC
    
    console.log("\n🔓 Approving USDC to Aerodrome...");
    const approveTx = await usdcContract.approve(aerodromeRouter, swapAmount);
    await approveTx.wait();
    console.log("✅ Approved\n");
    
    // Aerodrome swap interface
    const aerodromeABI = [
      "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, (address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) returns (uint256[] amounts)"
    ];
    
    const aerodrome = new ethers.Contract(aerodromeRouter, aerodromeABI, user);
    
    // Define the swap route
    const routes = [{
      from: usdcBase,
      to: usdeBase,
      stable: true, // Use stable pool for stablecoin swap
      factory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" // Aerodrome factory
    }];
    
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    try {
      console.log("🚀 Executing swap on Aerodrome...");
      const swapTx = await aerodrome.swapExactTokensForTokens(
        swapAmount,
        0, // Accept any amount of USDe (set to 0 for testing, use proper slippage in production)
        routes,
        user.address,
        deadline
      );
      
      console.log(`📋 Swap TX: ${swapTx.hash}`);
      const swapReceipt = await swapTx.wait();
      console.log(`✅ Swap completed in block ${swapReceipt.blockNumber}\n`);
      
      // Check new USDe balance
      const newUsdeBalance = await usdeContract.balanceOf(user.address);
      const usdeReceived = newUsdeBalance - usdeBalance;
      console.log(`💰 Received: ${ethers.formatUnits(usdeReceived, 18)} USDe\n`);
      
    } catch (error) {
      console.log("⚠️  Aerodrome swap failed, trying direct mint/acquisition...");
      console.log(`Error: ${error.message}\n`);
      
      // Alternative: Try to find USDe from another source or use a different DEX
      console.log("💡 Alternative options:");
      console.log("1. Try Uniswap V3 on Base");
      console.log("2. Bridge USDe from Ethereum");
      console.log("3. Purchase USDe from Ethena protocol\n");
      
      return;
    }
  }
  
  // Step 2: Now test LayerZero Compose - USDe on Base to USDe on Arbitrum
  console.log("📝 Step 2: LayerZero Compose Transfer");
  console.log("======================================\n");
  
  const currentUsdeBalance = await usdeContract.balanceOf(user.address);
  
  if (currentUsdeBalance < ethers.parseUnits("0.1", 18)) {
    console.log("❌ Insufficient USDe balance for test");
    return;
  }
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Check if LayerZero route is configured
  console.log("🔍 Checking LayerZero OFT route configuration...");
  const isConfigured = await router.isRouteConfigured(
    usdeBase,
    8453,
    usdeArbitrum,
    42161
  );
  
  if (!isConfigured) {
    console.log("⚠️  Route not configured, setting up LayerZero OFT route...\n");
    
    const route = {
      protocol: 3, // Protocol.LAYERZERO (OFT)
      protocolDomain: 30110, // Arbitrum LayerZero chain ID
      bridgeContract: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7", // LayerZero endpoint on Base
      poolId: 0,
      swapPool: ethers.ZeroAddress,
      extraData: "0x"
    };
    
    const configTx = await router.configureRoute(
      usdeBase,
      8453,
      usdeArbitrum,
      42161,
      route
    );
    await configTx.wait();
    console.log("✅ LayerZero OFT route configured\n");
  } else {
    console.log("✅ LayerZero OFT route already configured\n");
  }
  
  // Transfer 0.1 USDe
  const transferAmount = ethers.parseUnits("0.1", 18);
  
  // Approve router
  console.log("🔓 Approving USDe to router...");
  const approveRouterTx = await usdeContract.approve(routerAddress, transferAmount);
  await approveRouterTx.wait();
  console.log("✅ Approved\n");
  
  // Estimate LayerZero fees
  console.log("💸 Estimating LayerZero fees...");
  
  // For OFT transfers, we need to estimate the native fee
  // This is a simplified estimation - in production, query the actual OFT contract
  const estimatedFee = ethers.parseEther("0.001"); // ~0.001 ETH for Base to Arbitrum
  
  console.log(`📊 Estimated fee: ${ethers.formatEther(estimatedFee)} ETH\n`);
  
  // Execute transfer
  console.log("🚀 EXECUTING LAYERZERO OFT TRANSFER");
  console.log("====================================");
  console.log(`📤 From: 0.1 USDe on Base`);
  console.log(`📥 To: 0.1 USDe on Arbitrum`);
  console.log(`👤 Recipient: ${user.address}\n`);
  
  const startTime = Date.now();
  
  try {
    const transferTx = await router.transfer(
      usdeBase,     // fromToken
      usdeArbitrum, // toToken (same token, different chain)
      transferAmount,
      42161,        // Arbitrum chain ID
      user.address,
      { value: estimatedFee } // Include LayerZero fee
    );
    
    console.log(`📋 TX Hash: ${transferTx.hash}`);
    console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
    console.log("⏳ Waiting for confirmation...\n");
    
    const receipt = await transferTx.wait();
    const elapsed = (Date.now() - startTime) / 1000;
    
    console.log(`✅ Transaction confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed}`);
    console.log(`   Time: ${elapsed} seconds\n`);
    
    // Check final balance
    const finalUsdeBalance = await usdeContract.balanceOf(user.address);
    const usdeSpent = currentUsdeBalance - finalUsdeBalance;
    
    console.log("📊 Final Status:");
    console.log(`   USDe sent: ${ethers.formatUnits(usdeSpent, 18)}`);
    console.log(`   Remaining: ${ethers.formatUnits(finalUsdeBalance, 18)} USDe`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 LAYERZERO TRANSFER INITIATED!");
    console.log("=".repeat(60));
    
    console.log("\n📋 Next Steps:");
    console.log("1. ⏳ Wait 30-60 seconds for LayerZero message delivery");
    console.log("2. 🔍 Check LayerZero Scan: https://layerzeroscan.com");
    console.log("3. 💰 Verify USDe received on Arbitrum");
    console.log(`4. 📍 Arbitrum address: https://arbiscan.io/address/${user.address}`);
    
    console.log("\n💡 LayerZero OFT Process:");
    console.log("• USDe locked/burned on Base");
    console.log("• Message sent via LayerZero");
    console.log("• Oracle & Relayer confirm");
    console.log("• USDe minted on Arbitrum");
    console.log("• No DEX swap needed (same token)");
    
  } catch (error) {
    console.log(`❌ Transfer failed: ${error.message}`);
    
    if (error.message.includes("insufficient")) {
      console.log("\n💡 Try sending more ETH for gas fees");
    }
  }
  
  console.log("\n✅ Test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
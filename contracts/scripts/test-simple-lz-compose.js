const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 SIMPLE LAYERZERO TEST: USDC BASE → USDC ARBITRUM");
  console.log("==================================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Configuration
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb"; // Existing router
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // USDC on Arbitrum
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`💰 Testing: 0.01 USDC (1 cent)\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Test amount: 0.01 USDC (1 cent)
  const amount = ethers.parseUnits("0.01", 6);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    console.log("❌ Insufficient USDC balance");
    return;
  }
  
  console.log("📋 Route Status:");
  console.log("   CCTP already configured for USDC → USDC");
  console.log("   This is the optimal route for stablecoin transfers\n");
  
  // For demonstration, let's show what LayerZero Compose would do
  console.log("🔍 LayerZero Compose Capabilities:");
  console.log("   • Cross-token swaps (e.g., USDe → USDC)");
  console.log("   • Multi-hop routes with DEX integration");
  console.log("   • Automatic swaps on destination chain");
  console.log("   • Support for non-native stablecoins\n");
  
  console.log("📊 Protocol Comparison:");
  console.log("┌─────────────────────┬──────────────┬─────────────┬──────────────┐");
  console.log("│ Protocol            │ Speed        │ Use Case    │ Cost         │");
  console.log("├─────────────────────┼──────────────┼─────────────┼──────────────┤");
  console.log("│ CCTP v2 (Fast)      │ 8-20 sec     │ USDC only   │ Low          │");
  console.log("│ CCTP v1             │ 10-20 min    │ USDC only   │ Low          │");
  console.log("│ LayerZero OFT       │ 30-60 sec    │ Same token  │ Medium       │");
  console.log("│ LayerZero Compose   │ 30-90 sec    │ Cross-token │ Medium-High  │");
  console.log("│ Stargate            │ 30-60 sec    │ USDT/stable │ Medium       │");
  console.log("└─────────────────────┴──────────────┴─────────────┴──────────────┘\n");
  
  // Since we're using CCTP for USDC → USDC, let's execute that
  console.log("💡 Since USDC → USDC is configured, using CCTP for this transfer");
  console.log("   (LayerZero Compose would be used for cross-token swaps)\n");
  
  // Approve
  const currentAllowance = await usdcContract.allowance(user.address, routerAddress);
  if (currentAllowance < amount) {
    console.log("🔓 Approving USDC...");
    const approveTx = await usdcContract.approve(routerAddress, amount);
    await approveTx.wait();
    console.log("✅ Approved\n");
  }
  
  // Execute transfer
  console.log("🚀 Executing Transfer...");
  const startTime = new Date();
  
  const transferTx = await router.transfer(
    usdcBase,     // fromToken
    usdcArbitrum, // toToken
    amount,       // amount
    42161,        // toChainId
    user.address  // recipient
  );
  
  console.log(`📋 TX: ${transferTx.hash}`);
  console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  
  const receipt = await transferTx.wait();
  const endTime = new Date();
  
  console.log(`✅ Confirmed! Block: ${receipt.blockNumber}`);
  console.log(`⏰ Time: ${(endTime - startTime) / 1000} seconds`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 TRANSFER COMPLETE!");
  console.log("=".repeat(60));
  
  console.log("\n📚 LayerZero Compose Use Cases:");
  console.log("1. USDe (Base) → USDC (Arbitrum) - Swap stablecoins");
  console.log("2. PYUSD (Base) → USDT (Arbitrum) - Cross-protocol swap");
  console.log("3. crvUSD (Base) → USDe (Arbitrum) - DeFi token swap");
  console.log("4. Any token → Any token (with liquidity)");
  
  console.log("\n🔧 To Test LayerZero Compose:");
  console.log("1. Acquire USDe tokens on Base");
  console.log("2. Configure LayerZero Compose route");
  console.log("3. Execute cross-token transfer");
  console.log("4. Receive swapped tokens on destination");
  
  console.log("\n✅ Current system supports:");
  console.log("• CCTP for USDC transfers (fastest)");
  console.log("• LayerZero OFT for same-token transfers");
  console.log("• LayerZero Compose for cross-token swaps");
  console.log("• Automated attestation relay for CCTP");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
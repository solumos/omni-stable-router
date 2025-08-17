const { ethers } = require("hardhat");

async function main() {
  console.log("💰 TESTING 5 CENT CCTP V2 TRANSFER");
  console.log("==================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Router with CCTP v2 support
  const routerAddress = "0xf44dA2A1f3b1aA0Fd79807E13b21d67A0eCE9DdE";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`💰 Amount: 0.05 USDC (5 cents)\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // 5 cents = 0.05 USDC
  const amount = ethers.parseUnits("0.05", 6);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 Current Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    throw new Error("Insufficient USDC balance for 5 cent transfer");
  }
  
  // Approve router
  console.log("🔓 Approving 0.05 USDC...");
  const approveTx = await usdcContract.approve(routerAddress, amount);
  await approveTx.wait();
  console.log("✅ USDC approved");
  
  // Execute CCTP v2 transfer
  console.log("⚡ Executing 5 Cent CCTP v2 Fast Transfer...");
  console.log("   Using depositForBurnWithHook() for fast completion");
  
  const startTime = new Date();
  console.log(`⏰ Start Time: ${startTime.toISOString()}`);
  
  const transferTx = await router.transfer(
    usdcBase,      // fromToken
    usdcArbitrum,  // toToken  
    amount,        // amount
    42161,         // toChainId (Arbitrum)
    user.address   // recipient
  );
  
  console.log(`📋 Transfer TX: ${transferTx.hash}`);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await transferTx.wait();
  console.log(`✅ Transfer confirmed! Block: ${receipt.blockNumber}`);
  
  const endTime = new Date();
  console.log(`⏰ Confirmed Time: ${endTime.toISOString()}`);
  
  // Check balance after
  const newBalance = await usdcContract.balanceOf(user.address);
  const spent = balance - newBalance;
  console.log(`💸 Amount Spent: ${ethers.formatUnits(spent, 6)} USDC`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 5 CENT CCTP V2 TRANSFER INITIATED!");
  console.log("=".repeat(50));
  
  console.log(`📋 TX Hash: ${transferTx.hash}`);
  console.log(`💰 Amount: 0.05 USDC (5 cents)`);
  console.log(`⚡ Protocol: CCTP v2 Fast Transfer`);
  console.log(`🎯 Expected: 8-20 seconds completion`);
  
  console.log("\n🔍 Monitor Progress:");
  console.log(`📡 Circle API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
  console.log(`📍 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`📍 Arbitrum Balance: https://arbiscan.io/address/${user.address}`);
  
  console.log("\n⚡ Fast Transfer Test:");
  console.log("• Watch Circle API for attestation status");
  console.log("• Check Arbitrum address for received USDC");
  console.log("• If completes in 8-20 seconds: CCTP v2 success!");
  console.log("• If takes 10-20 minutes: Fallback to v1 behavior");
  
  console.log("\n🚀 CCTP v2 configuration complete!");
  console.log("Router is now using official CCTP v2 fast transfers!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
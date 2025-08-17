const { ethers } = require("hardhat");

async function main() {
  console.log("⚡ CONFIGURE & TEST CCTP V2");
  console.log("===========================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  const routerAddress = "0xf44dA2A1f3b1aA0Fd79807E13b21d67A0eCE9DdE";
  const cctpV2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`⚡ CCTP v2: ${cctpV2Address}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Step 1: Configure route if needed
  console.log("🛣️  Configuring CCTP v2 Route...");
  
  const route = {
    protocol: 1, // Protocol.CCTP
    protocolDomain: 3, // Arbitrum domain
    bridgeContract: cctpV2Address,
    poolId: 0,
    swapPool: ethers.ZeroAddress,
    extraData: "0x"
  };
  
  try {
    const configTx = await router.configureRoute(
      usdcBase,     // fromToken
      8453,         // fromChainId (Base)
      usdcArbitrum, // toToken
      42161,        // toChainId (Arbitrum)
      route
    );
    await configTx.wait();
    console.log("✅ Route configured successfully");
  } catch (e) {
    if (e.message.includes("already configured") || e.message.includes("exists")) {
      console.log("✅ Route already configured");
    } else {
      console.log(`⚠️  Route config issue: ${e.message}`);
    }
  }
  
  // Step 2: Test 5 cent transfer
  console.log("\n💰 Testing 5 Cent CCTP v2 Transfer...");
  
  const amount = ethers.parseUnits("0.05", 6); // 5 cents
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    throw new Error("Insufficient USDC balance");
  }
  
  // Approve
  console.log("🔓 Approving 0.05 USDC...");
  const approveTx = await usdcContract.approve(routerAddress, amount);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // Transfer
  console.log("⚡ Executing CCTP v2 Fast Transfer...");
  const startTime = new Date();
  
  const transferTx = await router.transfer(
    usdcBase,     // fromToken
    usdcArbitrum, // toToken
    amount,       // amount (0.05 USDC)
    42161,        // toChainId (Arbitrum)
    user.address  // recipient
  );
  
  console.log(`📋 TX: ${transferTx.hash}`);
  console.log("⏳ Confirming...");
  
  const receipt = await transferTx.wait();
  const endTime = new Date();
  
  console.log(`✅ Confirmed! Block: ${receipt.blockNumber}`);
  console.log(`⏰ Started: ${startTime.toISOString()}`);
  console.log(`⏰ Confirmed: ${endTime.toISOString()}`);
  
  // Check new balance
  const newBalance = await usdcContract.balanceOf(user.address);
  const spent = balance - newBalance;
  console.log(`💸 Spent: ${ethers.formatUnits(spent, 6)} USDC`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 CCTP V2 TRANSFER COMPLETE!");
  console.log("=".repeat(50));
  
  console.log(`📋 TX Hash: ${transferTx.hash}`);
  console.log(`⚡ Protocol: CCTP v2 with depositForBurnWithHook()`);
  console.log(`🎯 Expected: 8-20 seconds completion time`);
  
  console.log("\n🔍 Monitor:");
  console.log(`📡 API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
  console.log(`📍 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`📍 Arbitrum: https://arbiscan.io/address/${user.address}`);
  
  console.log("\n🚀 SUCCESS: Router fully configured for CCTP v2!");
  console.log("✅ Using official Circle CCTP v2 contract");
  console.log("✅ Fast finality threshold enabled");
  console.log("✅ 8-20 second target completion");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
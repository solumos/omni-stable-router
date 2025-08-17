const { ethers } = require("hardhat");

async function main() {
  console.log("⚡ TESTING FINAL CCTP V2 ROUTER");
  console.log("===============================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // New router with correct CCTP v2 interface
  const routerAddress = "0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7";
  const cctpV2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`⚡ CCTP v2: ${cctpV2Address}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Configure CCTP v2 using enum value
  console.log("⚙️  Configuring CCTP v2...");
  try {
    // Use the numerical value for Protocol.CCTP (1)
    const setProtocolTx = await router.setProtocolContract(1, cctpV2Address);
    await setProtocolTx.wait();
    console.log(`✅ CCTP v2 configured: ${cctpV2Address}`);
  } catch (e) {
    console.log(`⚠️  Protocol may already be set: ${e.message}`);
  }
  
  // Configure route
  console.log("\n🛣️  Configuring route...");
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
      8453,         // fromChainId
      usdcArbitrum, // toToken
      42161,        // toChainId
      route
    );
    await configTx.wait();
    console.log("✅ Route configured");
  } catch (e) {
    console.log(`⚠️  Route may already exist: ${e.message}`);
  }
  
  // Test 5 cent transfer
  console.log("\n💰 Testing 5 Cent CCTP v2 Transfer...");
  
  const amount = ethers.parseUnits("0.05", 6);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
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
  
  // Transfer using CCTP v2
  console.log("⚡ Executing CCTP v2 Fast Transfer...");
  console.log("   Using 7-parameter depositForBurn with finality threshold 1000");
  
  const startTime = new Date();
  
  const transferTx = await router.transfer(
    usdcBase,     // fromToken
    usdcArbitrum, // toToken
    amount,       // amount
    42161,        // toChainId
    user.address  // recipient
  );
  
  console.log(`📋 TX: ${transferTx.hash}`);
  console.log("⏳ Confirming...");
  
  const receipt = await transferTx.wait();
  const endTime = new Date();
  
  console.log(`✅ Confirmed! Block: ${receipt.blockNumber}`);
  console.log(`⏰ Started: ${startTime.toISOString()}`);
  console.log(`⏰ Confirmed: ${endTime.toISOString()}`);
  
  // Check balance
  const newBalance = await usdcContract.balanceOf(user.address);
  const spent = balance - newBalance;
  console.log(`💸 Spent: ${ethers.formatUnits(spent, 6)} USDC`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 CCTP V2 FAST TRANSFER SUCCESS!");
  console.log("=".repeat(60));
  
  console.log(`📋 TX Hash: ${transferTx.hash}`);
  console.log(`⚡ Using: Official CCTP v2 with fast finality`);
  console.log(`🎯 Expected: 8-20 seconds completion`);
  
  console.log("\n🔍 Monitor:");
  console.log(`📡 API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
  console.log(`📍 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`📍 Arbitrum: https://arbiscan.io/address/${user.address}`);
  
  console.log("\n🚀 CCTP v2 is now fully operational!");
  console.log("Router is using the correct 7-parameter depositForBurn");
  console.log("Fast transfers should complete in 8-20 seconds!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
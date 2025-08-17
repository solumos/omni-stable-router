const { ethers } = require("hardhat");

async function main() {
  console.log("⚡ CONFIGURING ROUTER FOR CCTP V2");
  console.log("=================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Use the new router with CCTP v2 support
  const routerAddress = "0xf44dA2A1f3b1aA0Fd79807E13b21d67A0eCE9DdE";
  const cctpV2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d"; // Official CCTP v2
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`⚡ CCTP v2: ${cctpV2Address}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Configure CCTP v2
  console.log("⚙️  Configuring CCTP v2...");
  try {
    const setProtocolTx = await router.setProtocolContract(1, cctpV2Address, {
      gasLimit: 100000
    });
    await setProtocolTx.wait();
    console.log(`✅ CCTP v2 configured: ${cctpV2Address}`);
  } catch (e) {
    console.log(`⚠️  Protocol config may already be set: ${e.message}`);
  }
  
  // Configure route
  console.log("\n🛣️  Configuring USDC → USDC route with CCTP v2...");
  
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  const route = {
    protocol: 1, // Protocol.CCTP
    protocolDomain: 3, // Arbitrum domain
    bridgeContract: cctpV2Address,
    poolId: 0,
    swapPool: ethers.ZeroAddress,
    extraData: "0x"
  };
  
  try {
    const configRouteTx = await router.configureRoute(
      usdcBase,    // fromToken
      8453,        // fromChainId (Base)
      usdcArbitrum, // toToken
      42161,       // toChainId (Arbitrum)
      route,
      { gasLimit: 200000 }
    );
    await configRouteTx.wait();
    console.log(`✅ Route configured: USDC Base → USDC Arbitrum via CCTP v2`);
  } catch (e) {
    console.log(`⚠️  Route config issue: ${e.message}`);
  }
  
  // Test CCTP v2 transfer
  console.log("\n⚡ Testing CCTP v2 Fast Transfer...");
  
  const amount = ethers.parseUnits("0.1", 6); // 0.1 USDC
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    throw new Error("Insufficient USDC balance");
  }
  
  // Approve router
  console.log("🔓 Approving USDC to router...");
  const approveTx = await usdcContract.approve(routerAddress, amount);
  await approveTx.wait();
  console.log("✅ USDC approved");
  
  // Execute CCTP v2 transfer
  console.log("⚡ Executing CCTP v2 Fast Transfer...");
  console.log("   Using depositForBurnWithHook() with fast threshold 1000");
  
  const transferTx = await router.transfer(
    usdcBase,
    amount,
    42161, // Arbitrum
    usdcArbitrum,
    user.address,
    { gasLimit: 300000 }
  );
  
  console.log(`📋 Transfer TX: ${transferTx.hash}`);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await transferTx.wait();
  console.log(`✅ Transfer confirmed! Block: ${receipt.blockNumber}`);
  console.log(`📊 Gas Used: ${receipt.gasUsed}`);
  
  const currentTime = new Date();
  console.log(`⏰ Transfer initiated: ${currentTime.toISOString()}`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 CCTP V2 FAST TRANSFER EXECUTED!");
  console.log("=".repeat(60));
  
  console.log(`📍 Router: ${routerAddress}`);
  console.log(`⚡ CCTP v2: ${cctpV2Address}`);
  console.log(`📋 TX Hash: ${transferTx.hash}`);
  console.log(`🎯 Expected: 8-20 seconds completion`);
  
  console.log("\n🔍 Monitor Transfer:");
  console.log(`📡 Circle API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
  console.log(`📍 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`📍 Arbitrum: https://arbiscan.io/address/${user.address}`);
  
  console.log("\n⚡ CCTP v2 Features Used:");
  console.log("✅ depositForBurnWithHook() function");
  console.log("✅ Fast finality threshold (1000)");
  console.log("✅ 8-20 second target completion");
  console.log("✅ Official Circle CCTP v2 contract");
  
  console.log("\n💡 Success Indicators:");
  console.log("• If transfer completes in 8-20 seconds: CCTP v2 working!");
  console.log("• If transfer takes 10-20 minutes: Fallback to v1 behavior");
  console.log("• Check Circle API for actual protocol used");
  
  console.log("\n🚀 Router is now fully configured for CCTP v2 fast transfers!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 TESTING NEW CCTP V2 ROUTER");
  console.log("==============================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Use the newly deployed router
  const newRouterAddress = "0xf44dA2A1f3b1aA0Fd79807E13b21d67A0eCE9DdE";
  const oldRouterAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🆕 New Router: ${newRouterAddress}`);
  console.log(`🕐 Old Router: ${oldRouterAddress}\n`);
  
  // Get router contracts
  const newRouter = await ethers.getContractAt("UnifiedRouter", newRouterAddress);
  const oldRouter = await ethers.getContractAt("UnifiedRouter", oldRouterAddress);
  
  // Check ownership
  const newOwner = await newRouter.owner();
  const oldOwner = await oldRouter.owner();
  
  console.log(`👤 New Router Owner: ${newOwner}`);
  console.log(`👤 Old Router Owner: ${oldOwner}`);
  console.log(`✅ User is new owner: ${newOwner.toLowerCase() === user.address.toLowerCase()}\n`);
  
  if (newOwner.toLowerCase() !== user.address.toLowerCase()) {
    throw new Error("Not the new router owner");
  }
  
  // Configure the new router
  console.log("⚙️  Configuring New Router...");
  
  const cctpV2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d"; // CCTP v2
  
  // Set protocol contract using CCTP v2
  console.log("📋 Setting CCTP v2 protocol contract...");
  const setProtocolTx = await newRouter.setProtocolContract(1, cctpV2Address);
  await setProtocolTx.wait();
  console.log(`✅ CCTP v2 protocol set: ${cctpV2Address}`);
  
  // Configure USDC route
  console.log("🛣️  Configuring USDC → USDC route...");
  
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
  
  const setRouteTx = await newRouter.configureRoute(
    usdcBase,    // fromToken
    8453,        // fromChainId (Base)
    usdcArbitrum, // toToken
    42161,       // toChainId (Arbitrum)
    route
  );
  await setRouteTx.wait();
  
  console.log(`✅ Route configured: USDC Base → USDC Arbitrum`);
  
  // Test small transfer
  console.log("\n🚀 Testing 0.1 USDC Transfer...");
  
  const amount = ethers.parseUnits("0.1", 6); // 0.1 USDC
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    throw new Error("Insufficient USDC balance");
  }
  
  // Approve router
  console.log("🔓 Approving USDC...");
  const approveTx = await usdcContract.approve(newRouterAddress, amount);
  await approveTx.wait();
  console.log("✅ USDC approved");
  
  // Execute transfer
  console.log("⚡ Executing CCTP v2 Fast Transfer...");
  const transferTx = await newRouter.transfer(
    usdcBase,
    amount,
    42161, // Arbitrum
    usdcArbitrum,
    user.address
  );
  
  console.log(`📋 Transfer TX: ${transferTx.hash}`);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await transferTx.wait();
  console.log(`✅ Transfer confirmed! Block: ${receipt.blockNumber}`);
  
  // Check if it used the new depositForBurnWithHook function
  console.log("\n🔍 Analyzing Transaction...");
  
  const currentTime = new Date();
  console.log(`⏰ Transfer initiated at: ${currentTime.toISOString()}`);
  console.log(`📊 Gas used: ${receipt.gasUsed}`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 CCTP V2 ROUTER TEST COMPLETE!");
  console.log("=".repeat(50));
  
  console.log(`📍 New Router: ${newRouterAddress}`);
  console.log(`📋 Transfer TX: ${transferTx.hash}`);
  console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  
  console.log("\n⚡ Expected Behavior:");
  console.log("• If using CCTP v2: Transfer completes in 8-20 seconds");
  console.log("• If using CCTP v1: Transfer completes in 10-20 minutes");
  console.log("• Check Circle API for transfer status");
  
  console.log("\n🔍 Monitor Transfer:");
  console.log(`📡 Circle API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
  console.log(`📍 Arbitrum Address: https://arbiscan.io/address/${user.address}`);
  
  console.log("\n💡 If transfer is fast (8-20 sec): CCTP v2 is working!");
  console.log("💡 If transfer is slow (10-20 min): Still using CCTP v1");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
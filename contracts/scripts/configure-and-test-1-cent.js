const { ethers } = require("hardhat");

async function main() {
  console.log("⚙️  CONFIGURE & TEST 1 CENT CCTP V2");
  console.log("==================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  const routerAddress = "0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7";
  const cctpV2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Configure route
  console.log("🛣️  Configuring CCTP v2 route...");
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
    console.log("⏳ Configuring route...");
    await configTx.wait();
    console.log("✅ Route configured!\n");
  } catch (e) {
    console.log(`⚠️  Route config: ${e.message}\n`);
  }
  
  // Test 1 cent transfer
  console.log("💰 Testing 1 Cent Transfer...");
  
  const amount = ethers.parseUnits("0.01", 6);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  // Approve
  console.log("🔓 Approving...");
  const approveTx = await usdcContract.approve(routerAddress, amount);
  await approveTx.wait();
  
  // Execute transfer
  console.log("⚡ Executing CCTP v2 Fast Transfer...");
  const startTime = new Date();
  
  const transferTx = await router.transfer(
    usdcBase,     // fromToken
    usdcArbitrum, // toToken
    amount,       // amount
    42161,        // toChainId
    user.address  // recipient
  );
  
  console.log(`📋 TX: ${transferTx.hash}`);
  const receipt = await transferTx.wait();
  const endTime = new Date();
  
  console.log(`✅ Confirmed! Block: ${receipt.blockNumber}`);
  console.log(`⏰ Time: ${(endTime - startTime) / 1000} seconds`);
  
  console.log("\n" + "=".repeat(50));
  console.log("🎉 CCTP V2 TRANSFER COMPLETE!");
  console.log("=".repeat(50));
  
  console.log("\n📍 Links:");
  console.log(`🔗 TX: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`📡 API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
  
  console.log("\n⚠️  IMPORTANT: Attestation Required!");
  console.log("The transfer is initiated but NOT complete.");
  console.log("To complete the transfer on Arbitrum:");
  console.log("1. Wait 8-20 seconds for attestation");
  console.log("2. Fetch attestation from Circle API");
  console.log("3. Call receiveMessage() on Arbitrum");
  console.log("4. USDC will be minted to recipient");
  
  console.log("\nWe can implement an attestation relayer to automate this!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
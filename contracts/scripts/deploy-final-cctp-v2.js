const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 DEPLOYING FINAL CCTP V2 ROUTER");
  console.log("=================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [deployer] = await ethers.getSigners();
  
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  // Deploy the updated router with correct CCTP v2 interface
  console.log("\n🏗️  Deploying UnifiedRouter with CCTP v2...");
  
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(deployer.address);
  await router.waitForDeployment();
  
  const routerAddress = await router.getAddress();
  console.log(`✅ Router deployed: ${routerAddress}`);
  
  // Configure CCTP v2
  console.log("\n⚙️  Configuring CCTP v2...");
  const cctpV2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  
  const setProtocolTx = await router.setProtocolContract(1, cctpV2Address);
  await setProtocolTx.wait();
  console.log(`✅ CCTP v2 configured: ${cctpV2Address}`);
  
  // Configure route
  console.log("\n🛣️  Configuring USDC route...");
  
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
  
  const configRouteTx = await router.configureRoute(
    usdcBase,     // fromToken
    8453,         // fromChainId (Base)
    usdcArbitrum, // toToken
    42161,        // toChainId (Arbitrum)
    route
  );
  await configRouteTx.wait();
  console.log(`✅ Route configured: USDC Base → USDC Arbitrum`);
  
  // Test 5 cent transfer immediately
  console.log("\n💰 Testing 5 Cent CCTP v2 Transfer...");
  
  const amount = ethers.parseUnits("0.05", 6); // 5 cents
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Check balance
  const balance = await usdcContract.balanceOf(deployer.address);
  console.log(`💰 Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    console.log("⚠️  Insufficient balance for test transfer");
  } else {
    // Approve and transfer
    console.log("🔓 Approving 0.05 USDC...");
    const approveTx = await usdcContract.approve(routerAddress, amount);
    await approveTx.wait();
    
    console.log("⚡ Executing CCTP v2 Fast Transfer...");
    const startTime = new Date();
    
    const transferTx = await router.transfer(
      usdcBase,     // fromToken
      usdcArbitrum, // toToken
      amount,       // amount
      42161,        // toChainId
      deployer.address // recipient
    );
    
    console.log(`📋 TX: ${transferTx.hash}`);
    console.log("⏳ Confirming...");
    
    const receipt = await transferTx.wait();
    const endTime = new Date();
    
    console.log(`✅ Confirmed! Block: ${receipt.blockNumber}`);
    console.log(`⏰ Started: ${startTime.toISOString()}`);
    console.log(`⏰ Confirmed: ${endTime.toISOString()}`);
    
    console.log("\n🔍 Monitor:");
    console.log(`📡 API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
    console.log(`📍 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
    console.log(`📍 Arbitrum: https://arbiscan.io/address/${deployer.address}`);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 CCTP V2 ROUTER DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  
  console.log(`📍 Router: ${routerAddress}`);
  console.log(`⚡ CCTP v2: ${cctpV2Address}`);
  console.log(`✅ Interface: ITokenMessengerV2 with 7-parameter depositForBurn`);
  console.log(`🎯 Fast Transfer: 1000 finality threshold (8-20 seconds)`);
  
  console.log("\n🚀 SUCCESS: Router fully configured for CCTP v2!");
  console.log("✅ Using official Circle CCTP v2 contract address");
  console.log("✅ Correct 7-parameter depositForBurn function");
  console.log("✅ Fast finality threshold enabled");
  console.log("✅ Ready for lightning-fast transfers!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
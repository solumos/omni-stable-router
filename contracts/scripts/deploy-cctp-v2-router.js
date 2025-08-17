const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 DEPLOYING CCTP V2 ROUTER WITH FAST TRANSFERS");
  console.log("==============================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [deployer] = await ethers.getSigners();
  
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  
  // Deploy the updated router with CCTP v2 fast transfer support
  console.log("\n🏗️  Deploying UnifiedRouter with CCTP v2 support...");
  
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(deployer.address);
  await router.waitForDeployment();
  
  const routerAddress = await router.getAddress();
  console.log(`✅ Router deployed: ${routerAddress}`);
  
  // Configure CCTP v1 first (we know this works)
  console.log("\n⚙️  Configuring CCTP v1 (proven working)...");
  const cctpV1Address = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  
  await router.setProtocolContract(1, cctpV1Address); // 1 = Protocol.CCTP
  console.log(`✅ CCTP v1 configured: ${cctpV1Address}`);
  
  // Configure routes
  console.log("\n🛣️  Configuring USDC → USDC route (Base → Arbitrum)...");
  
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  const route = {
    protocol: 1, // Protocol.CCTP
    protocolDomain: 3, // Arbitrum domain
    bridgeContract: cctpV1Address,
    poolId: 0,
    swapPool: ethers.ZeroAddress,
    extraData: "0x"
  };
  
  await router.setRoute(
    8453, // Base
    usdcBase,
    42161, // Arbitrum
    usdcArbitrum,
    route
  );
  
  console.log(`✅ Route configured: USDC Base → USDC Arbitrum`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 CCTP V2 ROUTER DEPLOYED!");
  console.log("=".repeat(60));
  
  console.log(`📍 Router Address: ${routerAddress}`);
  console.log(`⚡ CCTP Contract: ${cctpV1Address} (v1 for now)`);
  console.log(`✅ Fast Transfer Code: Ready (depositForBurnWithHook)`);
  
  console.log("\n🔧 Router Features:");
  console.log("✅ CCTP v2 depositForBurnWithHook() interface");
  console.log("✅ Fast finality threshold (1000 = 8-20 seconds)");
  console.log("✅ Fallback to v1 for compatibility");
  console.log("✅ Same transfer() function for users");
  
  console.log("\n🧪 Next Steps:");
  console.log("1. Test transfer with new router");
  console.log("2. If fast transfers work, this confirms v2 support");
  console.log("3. If still slow, need real CCTP v2 addresses");
  
  console.log("\n📋 Test Commands:");
  console.log(`export ROUTER_ADDRESS=${routerAddress}`);
  console.log(`# Test 0.1 USDC transfer`);
  console.log(`# Should complete in 8-20 seconds if v2 works`);
  
  console.log(`\n🔗 View on BaseScan: https://basescan.org/address/${routerAddress}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "base",
    chainId: 8453,
    router: routerAddress,
    cctp: cctpV1Address,
    features: ["cctp-v2-interface", "fast-transfers"],
    timestamp: new Date().toISOString()
  };
  
  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
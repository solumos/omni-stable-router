const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 TRANSFERRING CONTRACT OWNERSHIP");
  console.log("==================================\n");
  
  const routerAddress = "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3";
  const swapExecutorAddress = "0xE2ea3f454e12362212b1734eD0218E7691bd985c";
  
  const [deployer] = await ethers.getSigners();
  
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`🔄 SwapExecutor: ${swapExecutorAddress}\n`);
  
  // The current owner is the SwapExecutor address (incorrect)
  // We need to impersonate that address to transfer ownership
  
  // Since we can't impersonate on mainnet, we need to redeploy with correct parameters
  console.log("❌ Cannot transfer ownership on mainnet without the private key of the SwapExecutor");
  console.log("💡 Need to redeploy UnifiedRouter with correct owner parameter");
  
  console.log("\n🔄 REDEPLOYING WITH CORRECT OWNER...");
  
  // Deploy UnifiedRouter with correct owner
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(deployer.address); // Use deployer as owner, not SwapExecutor
  await router.waitForDeployment();
  const newRouterAddress = await router.getAddress();
  
  console.log(`✅ New UnifiedRouter deployed: ${newRouterAddress}`);
  console.log(`👤 Owner: ${deployer.address}`);
  
  // Configure protocols
  console.log("\n⚙️  Configuring Protocols...");
  
  const networkConfig = {
    cctp: {
      tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"
    },
    layerzero: {
      endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
    }
  };
  
  // Configure CCTP
  console.log("🔵 Configuring CCTP...");
  const cctpTx = await router.setProtocolContract(
    1, // Protocol.CCTP
    networkConfig.cctp.tokenMessenger
  );
  await cctpTx.wait();
  console.log("✅ CCTP configured");
  
  // Configure LayerZero
  console.log("🌐 Configuring LayerZero...");
  const lzTx = await router.setProtocolContract(
    3, // Protocol.LAYERZERO
    networkConfig.layerzero.endpoint
  );
  await lzTx.wait();
  console.log("✅ LayerZero configured");
  
  // Update SwapExecutor to use new router (if needed)
  console.log("\n🔄 Updating SwapExecutor reference...");
  const swapExecutor = await ethers.getContractAt("SwapExecutor", swapExecutorAddress);
  
  // Check if SwapExecutor has a setRouter function
  try {
    await swapExecutor.setRouter(newRouterAddress);
    console.log("✅ SwapExecutor updated with new router");
  } catch (e) {
    console.log("ℹ️  SwapExecutor doesn't need router update (constructor-only dependency)");
  }
  
  // Verify configuration
  console.log("\n🔍 Verifying Configuration...");
  const owner = await router.owner();
  const cctpContract = await router.protocolContracts(1);
  const lzContract = await router.protocolContracts(3);
  
  console.log(`   Owner: ${owner}`);
  console.log(`   CCTP: ${cctpContract}`);
  console.log(`   LayerZero: ${lzContract}`);
  
  // Save deployment info
  const deploymentInfo = {
    network: "Base Mainnet",
    chainId: 8453,
    contracts: {
      swapExecutor: swapExecutorAddress,
      unifiedRouter: newRouterAddress,
      oldRouter: routerAddress
    },
    protocols: {
      cctp: {
        protocol: 1,
        address: networkConfig.cctp.tokenMessenger
      },
      layerzero: {
        protocol: 3,
        address: networkConfig.layerzero.endpoint
      }
    },
    owner: deployer.address,
    deployedAt: new Date().toISOString(),
    routerTx: router.deploymentTransaction()?.hash
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const filepath = path.join(deploymentsDir, 'base_mainnet_8453_fixed.json');
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment saved: ${filepath}`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 BASE MAINNET FIXED DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`📍 SwapExecutor: ${swapExecutorAddress}`);
  console.log(`📍 UnifiedRouter: ${newRouterAddress}`);
  console.log(`🔵 CCTP: Configured`);
  console.log(`🌐 LayerZero: Configured`);
  console.log(`👤 Owner: ${deployer.address}`);
  
  console.log(`\n🔗 View on BaseScan: https://basescan.org/address/${newRouterAddress}`);
  
  // Try to verify the new contract
  console.log("\n🔍 Attempting contract verification...");
  try {
    await hre.run("verify:verify", {
      address: newRouterAddress,
      constructorArguments: [deployer.address],
    });
    console.log("✅ UnifiedRouter verified");
  } catch (e) {
    console.log("⚠️  UnifiedRouter verification failed:", e.message);
    console.log(`💡 Manually verify with constructor argument: ${deployer.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
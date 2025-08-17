const { ethers } = require("hardhat");
const testnetAddresses = require("./testnet-addresses");

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("========================================");
  console.log("🚀 UNIFIED ROUTER TESTNET DEPLOYMENT");
  console.log("========================================");
  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("========================================\n");

  // Determine which network we're deploying to
  let networkConfig;
  if (chainId === testnetAddresses.chainIds.baseSepolia) {
    networkConfig = {
      name: "Base Sepolia",
      cctp: testnetAddresses.cctp.baseSepolia,
      layerZero: testnetAddresses.layerZero.baseSepolia,
      uniswap: testnetAddresses.uniswap.baseSepolia,
      tokens: testnetAddresses.tokens.baseSepolia
    };
  } else if (chainId === testnetAddresses.chainIds.arbitrumSepolia) {
    networkConfig = {
      name: "Arbitrum Sepolia", 
      cctp: testnetAddresses.cctp.arbitrumSepolia,
      layerZero: testnetAddresses.layerZero.arbitrumSepolia,
      uniswap: testnetAddresses.uniswap.arbitrumSepolia,
      tokens: testnetAddresses.tokens.arbitrumSepolia
    };
  } else {
    throw new Error(`Unsupported network with chain ID: ${chainId}`);
  }

  console.log(`📍 Deploying to ${networkConfig.name}...`);
  console.log("Protocol addresses:");
  console.log("  CCTP TokenMessenger:", networkConfig.cctp.tokenMessenger);
  console.log("  LayerZero Endpoint:", networkConfig.layerZero.endpoint);
  console.log("  Uniswap Router:", networkConfig.uniswap.router);
  console.log("  USDC Token:", networkConfig.tokens.usdc);
  console.log("");

  // 1. Deploy SwapExecutor first (needed by UnifiedRouter)
  console.log("1️⃣ Deploying SwapExecutor...");
  const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy(
    networkConfig.uniswap.router
  );
  await swapExecutor.waitForDeployment();
  
  const swapExecutorAddress = await swapExecutor.getAddress();
  console.log("✅ SwapExecutor deployed to:", swapExecutorAddress);

  // 2. Deploy UnifiedRouter
  console.log("\n2️⃣ Deploying UnifiedRouter...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(deployer.address);
  await router.waitForDeployment();
  
  const routerAddress = await router.getAddress();
  console.log("✅ UnifiedRouter deployed to:", routerAddress);

  // 3. Configure protocol contracts
  console.log("\n3️⃣ Configuring protocol contracts...");
  
  // Set CCTP protocol (enum value 1)
  console.log("   Setting CCTP protocol...");
  let tx = await router.setProtocolContract(1, networkConfig.cctp.tokenMessenger);
  await tx.wait();
  console.log("   ✅ CCTP configured");

  // Set LayerZero protocol (enum value 3) 
  console.log("   Setting LayerZero protocol...");
  tx = await router.setProtocolContract(3, networkConfig.layerZero.endpoint);
  await tx.wait();
  console.log("   ✅ LayerZero configured");

  // 4. Configure SwapExecutor in router
  console.log("\n4️⃣ Configuring SwapExecutor...");
  try {
    tx = await router.setSwapExecutor(swapExecutorAddress);
    await tx.wait();
    console.log("✅ SwapExecutor configured in router");
  } catch (e) {
    console.log("⚠️  SwapExecutor configuration skipped (function may not exist)");
  }

  // 5. Configure basic USDC route (same chain for testing)
  console.log("\n5️⃣ Configuring basic USDC route...");
  try {
    const basicRoute = {
      protocol: 1, // CCTP
      protocolDomain: networkConfig.cctp.domain,
      bridgeContract: networkConfig.cctp.tokenMessenger,
      poolId: 0,
      swapPool: ethers.ZeroAddress,
      extraData: "0x"
    };

    tx = await router.configureRoute(
      networkConfig.tokens.usdc, // fromToken
      chainId,                   // fromChainId
      networkConfig.tokens.usdc, // toToken (same for testing)
      chainId,                   // toChainId (same for testing)
      basicRoute
    );
    await tx.wait();
    console.log("✅ Basic USDC route configured for testing");
  } catch (e) {
    console.log("⚠️  Route configuration failed:", e.message);
  }

  // 6. Save deployment info
  const deploymentInfo = {
    network: networkConfig.name,
    chainId: chainId,
    deployer: deployer.address,
    contracts: {
      unifiedRouter: routerAddress,
      swapExecutor: swapExecutorAddress
    },
    protocolAddresses: networkConfig,
    deployedAt: new Date().toISOString(),
    transactionHashes: {
      swapExecutor: swapExecutor.deploymentTransaction()?.hash,
      unifiedRouter: router.deploymentTransaction()?.hash
    }
  };

  console.log("\n========================================");
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log("UnifiedRouter:", routerAddress);
  console.log("SwapExecutor:", swapExecutorAddress);
  console.log("========================================");

  // Save to deployments folder
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `unified_${networkConfig.name.toLowerCase().replace(' ', '_')}_${chainId}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${filepath}`);

  console.log("\n🔧 Next steps:");
  console.log("1. Verify contracts on block explorer");
  console.log("2. Configure cross-chain routes to other testnets");
  console.log("3. Fund deployer with testnet USDC for testing");
  console.log("4. Update frontend with new contract addresses");
  console.log("5. Test cross-chain transfers between testnets");

  // Try to verify contracts (will only work if API keys are set)
  console.log("\n🔍 Attempting contract verification...");
  try {
    await hre.run("verify:verify", {
      address: routerAddress,
      constructorArguments: [deployer.address],
    });
    console.log("✅ UnifiedRouter verified");
  } catch (e) {
    console.log("⚠️  UnifiedRouter verification failed:", e.message);
  }

  try {
    await hre.run("verify:verify", {
      address: swapExecutorAddress,
      constructorArguments: [
        networkConfig.uniswap.router
      ],
    });
    console.log("✅ SwapExecutor verified");
  } catch (e) {
    console.log("⚠️  SwapExecutor verification failed:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
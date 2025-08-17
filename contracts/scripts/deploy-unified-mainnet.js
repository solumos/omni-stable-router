const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 DEPLOYING UNIFIED ROUTER TO MAINNET");
  console.log("=====================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // Mainnet configurations
  const networkConfigs = {
    8453: { // Base Mainnet
      name: "Base Mainnet",
      cctp: {
        tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
        messageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4"
      },
      uniswap: {
        router: "0x2626664c2603336E57B271c5C0b26F421741e481"
      },
      layerzero: {
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      },
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    },
    42161: { // Arbitrum One
      name: "Arbitrum One",
      cctp: {
        tokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
        messageTransmitter: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca"
      },
      uniswap: {
        router: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
      },
      layerzero: {
        endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
      },
      usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    }
  };
  
  const networkConfig = networkConfigs[chainId];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  
  const [deployer] = await ethers.getSigners();
  
  console.log(`📍 Network: ${networkConfig.name} (${chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 ETH Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))}\n`);
  
  // Deploy SwapExecutor first
  console.log("🔄 Deploying SwapExecutor...");
  const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy(
    networkConfig.uniswap.router
  );
  await swapExecutor.waitForDeployment();
  const swapExecutorAddress = await swapExecutor.getAddress();
  console.log(`✅ SwapExecutor deployed: ${swapExecutorAddress}`);
  
  // Deploy UnifiedRouter
  console.log("\n🌉 Deploying UnifiedRouter...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(deployer.address); // Use deployer as owner
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`✅ UnifiedRouter deployed: ${routerAddress}`);
  
  // Configure protocols
  console.log("\n⚙️  Configuring Protocols...");
  
  // Configure CCTP
  console.log("🔵 Configuring CCTP...");
  const cctpTx = await router.setProtocolContract(
    1, // CCTP
    networkConfig.cctp.tokenMessenger
  );
  await cctpTx.wait();
  console.log("✅ CCTP configured");
  
  // Configure LayerZero
  console.log("🌐 Configuring LayerZero...");
  const lzTx = await router.setProtocolContract(
    3, // LAYERZERO
    networkConfig.layerzero.endpoint
  );
  await lzTx.wait();
  console.log("✅ LayerZero configured");
  
  // Save deployment info
  const deploymentInfo = {
    network: networkConfig.name,
    chainId: chainId,
    contracts: {
      swapExecutor: swapExecutorAddress,
      unifiedRouter: routerAddress
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
    tokens: {
      usdc: networkConfig.usdc
    },
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    swapExecutorTx: swapExecutor.deploymentTransaction()?.hash,
    routerTx: router.deploymentTransaction()?.hash
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `${networkConfig.name.toLowerCase().replace(' ', '_')}_${chainId}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment saved: ${filepath}`);
  
  console.log("\n" + "=".repeat(60));
  console.log(`🎉 ${networkConfig.name.toUpperCase()} DEPLOYMENT COMPLETE!`);
  console.log("=".repeat(60));
  console.log(`📍 SwapExecutor: ${swapExecutorAddress}`);
  console.log(`📍 UnifiedRouter: ${routerAddress}`);
  console.log(`🔵 CCTP Protocol: Configured`);
  console.log(`🌐 LayerZero Protocol: Configured`);
  
  if (chainId === 8453) {
    console.log(`\n🔗 Base Explorer: https://basescan.org/address/${routerAddress}`);
  } else if (chainId === 42161) {
    console.log(`\n🔗 Arbitrum Explorer: https://arbiscan.io/address/${routerAddress}`);
  }
  
  console.log("\n📋 Next Steps:");
  console.log("1. ✅ Contract deployed and protocols configured");
  console.log("2. 🔄 Deploy to the other mainnet");
  console.log("3. 🛣️  Configure cross-chain routes");
  console.log("4. 🌐 Update frontend configuration");
  console.log("5. 🧪 Test cross-chain functionality");
  
  // Try to verify contracts
  console.log("\n🔍 Attempting contract verification...");
  try {
    await hre.run("verify:verify", {
      address: swapExecutorAddress,
      constructorArguments: [networkConfig.uniswap.router],
    });
    console.log("✅ SwapExecutor verified");
  } catch (e) {
    console.log("⚠️  SwapExecutor verification failed:", e.message);
  }
  
  try {
    await hre.run("verify:verify", {
      address: routerAddress,
      constructorArguments: [swapExecutorAddress],
    });
    console.log("✅ UnifiedRouter verified");
  } catch (e) {
    console.log("⚠️  UnifiedRouter verification failed:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
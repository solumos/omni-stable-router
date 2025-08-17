const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Base Sepolia Configuration
const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  cctpDomain: 6,
  layerZeroId: 10245,
  stargateId: 10245,
  contracts: {
    cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    layerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    stargateRouter: "0x0000000000000000000000000000000000000000",
    uniswapV3Router: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
};

// Already deployed contracts (updated with CCTPHookReceiver)
const DEPLOYED = {
  swapExecutor: "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8",
  feeManager: "0xA0FD978f89D941783A43aFBe092B614ef31571F3",
  hookReceiver: "0xE2ea3f454e12362212b1734eD0218E7691bd985c"  // Just deployed!
};

async function main() {
  console.log("🔄 Final Base Sepolia Deployment...\n");
  
  const config = BASE_SEPOLIA_CONFIG;
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", formatEther(balance), "ETH");
  
  // Check current nonce
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("📝 Current nonce:", nonce);
  
  console.log("\n✅ Already deployed:");
  console.log("├── SwapExecutor:", DEPLOYED.swapExecutor);
  console.log("├── FeeManager:", DEPLOYED.feeManager);
  console.log("└── CCTPHookReceiver:", DEPLOYED.hookReceiver);
  console.log("\n");
  
  const deployedContracts = { ...DEPLOYED };
  
  try {
    // Wait a bit for network to sync
    console.log("⏳ Waiting for network sync...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // ============ 4. Deploy RouteProcessor (UUPS Proxy) ============
    console.log("📦 4. Deploying RouteProcessor (UUPS Proxy)...");
    const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
    
    // Clear any cached deployment data that might cause nonce issues
    const deploymentPath = path.join(__dirname, "../.openzeppelin/base-sepolia.json");
    if (fs.existsSync(deploymentPath)) {
      console.log("   Clearing cached deployment data...");
      const data = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      // Keep existing data but clear any pending transactions
      fs.writeFileSync(deploymentPath, JSON.stringify(data, null, 2));
    }
    
    const routeProcessor = await upgrades.deployProxy(
      RouteProcessor,
      [
        deployer.address,
        config.contracts.cctpTokenMessenger,
        config.contracts.cctpMessageTransmitter,
        config.contracts.layerZeroEndpoint,
        ethers.ZeroAddress // No Stargate on Base Sepolia yet
      ],
      { 
        kind: 'uups',
        initializer: 'initialize',
        txOverrides: {
          gasLimit: 5000000 // Set explicit gas limit
        }
      }
    );
    await routeProcessor.waitForDeployment();
    deployedContracts.routeProcessor = await routeProcessor.getAddress();
    console.log("✅ RouteProcessor deployed to:", deployedContracts.routeProcessor);
    
    // ============ 5. Deploy StableRouter (UUPS Proxy) ============
    console.log("\n📦 5. Deploying StableRouter (UUPS Proxy)...");
    const StableRouter = await ethers.getContractFactory("StableRouter");
    const stableRouter = await upgrades.deployProxy(
      StableRouter,
      [
        deployedContracts.routeProcessor,
        deployedContracts.swapExecutor,
        deployedContracts.feeManager
      ],
      { 
        kind: 'uups',
        initializer: 'initialize',
        txOverrides: {
          gasLimit: 5000000
        }
      }
    );
    await stableRouter.waitForDeployment();
    deployedContracts.stableRouter = await stableRouter.getAddress();
    console.log("✅ StableRouter deployed to:", deployedContracts.stableRouter);
    
    // ============ 6. Configure Access Controls ============
    console.log("\n⚙️  Configuring Access Controls...");
    
    // Get contract instances
    const feeManager = await ethers.getContractAt("FeeManager", deployedContracts.feeManager);
    const hookReceiverContract = await ethers.getContractAt("CCTPHookReceiver", deployedContracts.hookReceiver);
    const routeProcessorContract = await ethers.getContractAt("RouteProcessor", deployedContracts.routeProcessor);
    
    // Authorize StableRouter
    const tx1 = await feeManager.authorizeCollector(deployedContracts.stableRouter, true);
    await tx1.wait();
    console.log("✅ Authorized StableRouter as fee collector");
    
    // Configure Sepolia as authorized sender
    const SEPOLIA_DOMAIN = 0;
    const sepoliaRouteProcessor = "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de";
    
    const tx2 = await hookReceiverContract.setAuthorizedSender(
      SEPOLIA_DOMAIN,
      ethers.zeroPadValue(sepoliaRouteProcessor, 32),
      true
    );
    await tx2.wait();
    console.log("✅ Authorized Sepolia RouteProcessor as CCTP sender");
    
    // Configure USDC
    console.log("\n⚙️  Configuring Tokens...");
    const tx3 = await routeProcessorContract.configureToken(
      config.contracts.usdc,
      true,
      ethers.ZeroAddress,
      0
    );
    await tx3.wait();
    console.log("✅ Configured USDC token");
    
    const tx4 = await hookReceiverContract.setSupportedToken(config.contracts.usdc, true);
    await tx4.wait();
    console.log("✅ Set USDC as supported in hook receiver");
    
    // Save deployment info
    const deploymentInfo = {
      network: "baseSepolia",
      chainId: config.chainId,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts,
      externalContracts: config.contracts,
      configuration: {
        cctpDomain: config.cctpDomain,
        layerZeroId: config.layerZeroId,
        authorizedSenders: {
          sepolia: sepoliaRouteProcessor
        }
      }
    };
    
    const deploymentSavePath = path.join(__dirname, `../deployments/base-sepolia-deployment.json`);
    fs.mkdirSync(path.dirname(deploymentSavePath), { recursive: true });
    fs.writeFileSync(deploymentSavePath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=====================================");
    console.log("🎉 BASE SEPOLIA DEPLOYMENT COMPLETE!");
    console.log("=====================================\n");
    console.log("📋 Deployed Contracts:");
    console.log("├── StableRouter:", deployedContracts.stableRouter);
    console.log("├── RouteProcessor:", deployedContracts.routeProcessor);
    console.log("├── SwapExecutor:", deployedContracts.swapExecutor);
    console.log("├── FeeManager:", deployedContracts.feeManager);
    console.log("└── CCTPHookReceiver:", deployedContracts.hookReceiver);
    
    console.log("\n🔗 View on BaseScan:");
    console.log(`https://sepolia.basescan.org/address/${deployedContracts.stableRouter}`);
    
    console.log("\n✅ Ready to receive CCTP transfers from Sepolia!");
    console.log("\n🚀 Next: Update Sepolia to recognize Base Sepolia:");
    console.log("   npx hardhat run scripts/update-sepolia-for-base.js --network sepolia");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    
    if (error.message.includes("nonce")) {
      console.log("\n💡 Nonce issue detected. Try:");
      console.log("1. Wait 30 seconds and retry");
      console.log("2. Check pending transactions on BaseScan");
      console.log("3. Clear MetaMask activity data (Settings > Advanced > Clear activity tab data)");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
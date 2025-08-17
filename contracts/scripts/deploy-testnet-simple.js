const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Testnet Configuration
const TESTNET_CONFIG = {
  sepolia: {
    chainId: 11155111,
    cctpDomain: 0,
    layerZeroId: 10161,
    stargateId: 10161,
    contracts: {
      cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      layerZeroEndpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
      stargateRouter: "0x1d4C2a246311bB9f827F4C768e277FF5787B7D7E",
      uniswapV3Router: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    }
  },
  arbitrumSepolia: {
    chainId: 421614,
    cctpDomain: 3,
    layerZeroId: 10231,
    stargateId: 10231,
    contracts: {
      cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      layerZeroEndpoint: "0x6098e96a28E02f27B1e6BD381f870F1C8Bd169d3",
      stargateRouter: "0xb850873f4c993Ac2405A1AdD71F6ca5D4d4d6b4f",
      uniswapV3Router: "0x101F443B4d1b059569D643917553c771E1b9663E",
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    }
  }
};

async function main() {
  console.log("🚀 Starting Simple Testnet Deployment (No Multi-sig)...\n");
  
  const network = hre.network.name;
  const config = TESTNET_CONFIG[network];
  
  if (!config) {
    throw new Error(`No configuration found for network: ${network}`);
  }
  
  console.log(`📍 Deploying to ${network} (chainId: ${config.chainId})`);
  console.log("=====================================\n");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", formatEther(balance), "ETH\n");
  
  // Track deployed addresses
  const deployedContracts = {};
  
  try {
    // ============ 1. Deploy SwapExecutor ============
    console.log("📦 1. Deploying SwapExecutor...");
    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    const swapExecutor = await SwapExecutor.deploy(config.contracts.uniswapV3Router);
    await swapExecutor.waitForDeployment();
    deployedContracts.swapExecutor = await swapExecutor.getAddress();
    console.log("✅ SwapExecutor deployed to:", deployedContracts.swapExecutor);
    
    // ============ 2. Deploy FeeManager ============
    console.log("\n📦 2. Deploying FeeManager...");
    const FeeManager = await ethers.getContractFactory("FeeManager");
    const feeManager = await FeeManager.deploy(deployer.address);
    await feeManager.waitForDeployment();
    deployedContracts.feeManager = await feeManager.getAddress();
    console.log("✅ FeeManager deployed to:", deployedContracts.feeManager);
    
    // ============ 3. Deploy CCTPHookReceiver ============
    console.log("\n📦 3. Deploying CCTPHookReceiver...");
    const CCTPHookReceiver = await ethers.getContractFactory("CCTPHookReceiver");
    const hookReceiver = await CCTPHookReceiver.deploy(
      deployedContracts.swapExecutor,
      config.contracts.cctpMessageTransmitter,
      config.contracts.usdc
    );
    await hookReceiver.waitForDeployment();
    deployedContracts.hookReceiver = await hookReceiver.getAddress();
    console.log("✅ CCTPHookReceiver deployed to:", deployedContracts.hookReceiver);
    
    // ============ 4. Deploy RouteProcessor (UUPS Proxy) ============
    console.log("\n📦 4. Deploying RouteProcessor (UUPS Proxy)...");
    const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
    const routeProcessor = await upgrades.deployProxy(
      RouteProcessor,
      [
        deployer.address, // Owner - just the deployer
        config.contracts.cctpTokenMessenger,
        config.contracts.cctpMessageTransmitter,
        config.contracts.layerZeroEndpoint,
        config.contracts.stargateRouter
      ],
      { 
        kind: 'uups',
        initializer: 'initialize'
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
        initializer: 'initialize'
      }
    );
    await stableRouter.waitForDeployment();
    deployedContracts.stableRouter = await stableRouter.getAddress();
    console.log("✅ StableRouter deployed to:", deployedContracts.stableRouter);
    
    // ============ 6. Configure Access Controls ============
    console.log("\n⚙️  6. Configuring Access Controls...");
    
    // Authorize StableRouter to record fees
    const tx1 = await feeManager.authorizeCollector(deployedContracts.stableRouter, true);
    await tx1.wait();
    console.log("✅ Authorized StableRouter as fee collector");
    
    // Configure CCTPHookReceiver authorized senders
    const tx2 = await hookReceiver.setAuthorizedSender(
      config.cctpDomain,
      ethers.zeroPadValue(deployedContracts.routeProcessor, 32),
      true
    );
    await tx2.wait();
    console.log("✅ Authorized RouteProcessor as CCTP sender");
    
    // Configure tokens
    console.log("\n⚙️  7. Configuring Tokens...");
    const tx3 = await routeProcessor.configureToken(
      config.contracts.usdc,
      true,  // isUSDC
      ethers.ZeroAddress,
      0
    );
    await tx3.wait();
    console.log("✅ Configured USDC token");
    
    // Configure supported tokens in CCTPHookReceiver
    const tx4 = await hookReceiver.setSupportedToken(config.contracts.usdc, true);
    await tx4.wait();
    console.log("✅ Set USDC as supported in hook receiver");
    
    // ============ 8. Save Deployment Info ============
    const deploymentInfo = {
      network: network,
      chainId: config.chainId,
      deployer: deployer.address,
      owner: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts,
      externalContracts: config.contracts,
      configuration: {
        cctpDomain: config.cctpDomain,
        layerZeroId: config.layerZeroId,
        stargateId: config.stargateId
      }
    };
    
    const deploymentPath = path.join(__dirname, `../deployments/${network}-deployment-simple.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=====================================");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=====================================\n");
    console.log("📄 Deployment info saved to:", deploymentPath);
    console.log("\n📋 Deployed Contracts:");
    console.log("├── StableRouter:", deployedContracts.stableRouter);
    console.log("├── RouteProcessor:", deployedContracts.routeProcessor);
    console.log("├── SwapExecutor:", deployedContracts.swapExecutor);
    console.log("├── FeeManager:", deployedContracts.feeManager);
    console.log("└── CCTPHookReceiver:", deployedContracts.hookReceiver);
    
    console.log("\n👤 Owner:", deployer.address);
    console.log("   (All contracts owned by deployer - no multi-sig)");
    
    console.log("\n🔍 Next Steps:");
    console.log("1. Verify contracts on Etherscan:");
    console.log(`   npx hardhat run scripts/verify-testnet-simple.js --network ${network}`);
    console.log("\n2. Run tests:");
    console.log(`   npx hardhat run scripts/test-testnet-simple.js --network ${network}`);
    console.log("\n3. Configure additional tokens and pools");
    console.log("4. Set up cross-chain receivers on other testnets");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
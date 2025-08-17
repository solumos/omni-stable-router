const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Base Sepolia Configuration
const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  cctpDomain: 6,  // Base CCTP domain
  layerZeroId: 10245,  // Base Sepolia LZ ID
  stargateId: 10245,
  contracts: {
    // CCTP contracts on Base Sepolia
    cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    
    // LayerZero endpoint
    layerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    
    // Stargate router (if available on Base Sepolia)
    stargateRouter: "0x0000000000000000000000000000000000000000", // Not yet deployed
    
    // Uniswap V3 on Base Sepolia
    uniswapV3Router: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4",
    
    // USDC on Base Sepolia
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
};

async function main() {
  console.log("🚀 Starting Base Sepolia Deployment...\n");
  
  const network = hre.network.name;
  if (network !== "baseSepolia") {
    throw new Error(`Wrong network! Expected baseSepolia, got ${network}`);
  }
  
  const config = BASE_SEPOLIA_CONFIG;
  
  console.log(`📍 Deploying to Base Sepolia (chainId: ${config.chainId})`);
  console.log("=====================================\n");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", formatEther(balance), "ETH\n");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Low balance! You need at least 0.01 ETH");
    console.log("Get Base Sepolia ETH:");
    console.log("1. Get Sepolia ETH from: https://sepoliafaucet.com");
    console.log("2. Bridge to Base: https://bridge.base.org");
    process.exit(1);
  }
  
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
        deployer.address,
        config.contracts.cctpTokenMessenger,
        config.contracts.cctpMessageTransmitter,
        config.contracts.layerZeroEndpoint,
        config.contracts.stargateRouter || ethers.ZeroAddress // Use zero address if not available
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
    
    // Configure CCTPHookReceiver authorized senders for Sepolia
    const SEPOLIA_DOMAIN = 0; // Sepolia CCTP domain
    // We'll need the Sepolia RouteProcessor address here
    // For now, we'll set it to zero and update later
    const sepoliaRouteProcessor = "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"; // From Sepolia deployment
    
    const tx2 = await hookReceiver.setAuthorizedSender(
      SEPOLIA_DOMAIN,
      ethers.zeroPadValue(sepoliaRouteProcessor, 32),
      true
    );
    await tx2.wait();
    console.log("✅ Authorized Sepolia RouteProcessor as CCTP sender");
    
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
    
    // Set CCTP hook receiver for receiving from Sepolia
    const tx5 = await routeProcessor.setCCTPHookReceiver(
      11155111, // Sepolia chain ID
      deployedContracts.hookReceiver
    );
    await tx5.wait();
    console.log("✅ Set hook receiver for Sepolia -> Base transfers");
    
    // ============ 8. Save Deployment Info ============
    const deploymentInfo = {
      network: "baseSepolia",
      chainId: config.chainId,
      deployer: deployer.address,
      owner: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployedContracts,
      externalContracts: config.contracts,
      configuration: {
        cctpDomain: config.cctpDomain,
        layerZeroId: config.layerZeroId,
        stargateId: config.stargateId,
        authorizedSenders: {
          sepolia: sepoliaRouteProcessor
        }
      }
    };
    
    const deploymentPath = path.join(__dirname, `../deployments/base-sepolia-deployment.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=====================================");
    console.log("🎉 BASE SEPOLIA DEPLOYMENT COMPLETE!");
    console.log("=====================================\n");
    console.log("📄 Deployment info saved to:", deploymentPath);
    console.log("\n📋 Deployed Contracts:");
    console.log("├── StableRouter:", deployedContracts.stableRouter);
    console.log("├── RouteProcessor:", deployedContracts.routeProcessor);
    console.log("├── SwapExecutor:", deployedContracts.swapExecutor);
    console.log("├── FeeManager:", deployedContracts.feeManager);
    console.log("└── CCTPHookReceiver:", deployedContracts.hookReceiver);
    
    console.log("\n👤 Owner:", deployer.address);
    
    console.log("\n🔍 View on BaseScan:");
    console.log(`https://sepolia.basescan.org/address/${deployedContracts.stableRouter}`);
    
    console.log("\n🔗 Cross-Chain Setup:");
    console.log("✅ Can receive CCTP from Sepolia");
    console.log("✅ Hook receiver configured for atomic swaps");
    
    console.log("\n🚀 Next Steps:");
    console.log("1. Update Sepolia contracts to recognize Base Sepolia:");
    console.log(`   npx hardhat run scripts/update-sepolia-config.js --network sepolia`);
    console.log("\n2. Get test USDC on Base Sepolia:");
    console.log("   https://faucet.circle.com");
    console.log("\n3. Test cross-chain transfer:");
    console.log("   Sepolia -> Base Sepolia");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
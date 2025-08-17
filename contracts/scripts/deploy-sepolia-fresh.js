const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Sepolia Configuration
const SEPOLIA_CONFIG = {
  chainId: 11155111,
  cctpDomain: 0,  // Sepolia CCTP domain
  layerZeroId: 10161,  // Sepolia LZ ID
  contracts: {
    // CCTP contracts on Sepolia
    cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    
    // LayerZero endpoint
    layerZeroEndpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
    
    // Stargate router
    stargateRouter: "0x0000000000000000000000000000000000000000", // Not deployed on testnet
    
    // Uniswap V3 on Sepolia
    uniswapV3Router: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    
    // USDC on Sepolia
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  }
};

async function main() {
  console.log("🚀 Starting Fresh Sepolia Deployment...\n");
  
  const network = hre.network.name;
  if (network !== "sepolia") {
    throw new Error(`Wrong network! Expected sepolia, got ${network}`);
  }
  
  const config = SEPOLIA_CONFIG;
  
  console.log(`📍 Deploying to Sepolia (chainId: ${config.chainId})`);
  console.log("=====================================\n");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", formatEther(balance), "ETH\n");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance. Get testnet ETH from:");
    console.log("https://sepoliafaucet.com");
    console.log("https://www.alchemy.com/faucets/ethereum-sepolia");
    return;
  }
  
  console.log("📦 Starting deployment...\n");
  
  const deployedContracts = {};
  
  // Deploy SwapExecutor (not upgradeable)
  console.log("1️⃣ Deploying SwapExecutor...");
  const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy(config.contracts.uniswapV3Router);
  await swapExecutor.waitForDeployment();
  deployedContracts.SwapExecutor = await swapExecutor.getAddress();
  console.log("✅ SwapExecutor deployed to:", deployedContracts.SwapExecutor);
  
  // Deploy CCTPHookReceiver (not upgradeable)
  console.log("\n2️⃣ Deploying CCTPHookReceiver...");
  const CCTPHookReceiver = await ethers.getContractFactory("CCTPHookReceiver");
  const cctpHookReceiver = await CCTPHookReceiver.deploy(
    deployedContracts.SwapExecutor,
    config.contracts.cctpMessageTransmitter,
    config.contracts.usdc
  );
  await cctpHookReceiver.waitForDeployment();
  deployedContracts.CCTPHookReceiver = await cctpHookReceiver.getAddress();
  console.log("✅ CCTPHookReceiver deployed to:", deployedContracts.CCTPHookReceiver);
  
  // Deploy RouteProcessor (upgradeable)
  console.log("\n3️⃣ Deploying RouteProcessor...");
  const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
  const routeProcessor = await upgrades.deployProxy(
    RouteProcessor,
    [
      deployer.address,  // owner
      config.contracts.cctpTokenMessenger,
      config.contracts.cctpMessageTransmitter,
      config.contracts.layerZeroEndpoint,
      config.contracts.stargateRouter
    ],
    { initializer: "initialize" }
  );
  await routeProcessor.waitForDeployment();
  deployedContracts.RouteProcessor = await routeProcessor.getAddress();
  console.log("✅ RouteProcessor deployed to:", deployedContracts.RouteProcessor);
  
  // Deploy FeeManager
  console.log("\n4️⃣ Deploying FeeManager...");
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(deployer.address);
  await feeManager.waitForDeployment();
  deployedContracts.FeeManager = await feeManager.getAddress();
  console.log("✅ FeeManager deployed to:", deployedContracts.FeeManager);
  
  // Deploy StableRouter (upgradeable)
  console.log("\n5️⃣ Deploying StableRouter...");
  const StableRouter = await ethers.getContractFactory("StableRouter");
  const stableRouter = await upgrades.deployProxy(
    StableRouter,
    [
      deployedContracts.RouteProcessor,
      deployedContracts.SwapExecutor,
      deployedContracts.FeeManager
    ],
    { initializer: "initialize" }
  );
  await stableRouter.waitForDeployment();
  deployedContracts.StableRouter = await stableRouter.getAddress();
  console.log("✅ StableRouter deployed to:", deployedContracts.StableRouter);
  
  // Post-deployment configuration
  console.log("\n⚙️  Configuring contracts...\n");
  
  // Configure USDC in RouteProcessor
  console.log("6️⃣ Configuring USDC as CCTP token...");
  const tx1 = await routeProcessor.configureToken(
    config.contracts.usdc,
    true,  // isUSDC
    ethers.ZeroAddress,  // No OFT for USDC
    0  // No Stargate pool
  );
  await tx1.wait();
  console.log("✅ USDC configured");
  
  // Set CCTP domains for testnets (need to add these manually since they're not in initialization)
  console.log("\n7️⃣ Setting CCTP hook receivers for other testnets...");
  
  // Base Sepolia
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const BASE_HOOK_RECEIVER = "0xE2ea3f454e12362212b1734eD0218E7691bd985c";
  const tx2 = await routeProcessor.setCCTPHookReceiver(
    BASE_SEPOLIA_CHAIN_ID,
    BASE_HOOK_RECEIVER
  );
  await tx2.wait();
  console.log("✅ Base Sepolia hook receiver set");
  
  // Arbitrum Sepolia
  const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
  const ARBITRUM_HOOK_RECEIVER = "0xA0FD978f89D941783A43aFBe092B614ef31571F3";
  const tx3 = await routeProcessor.setCCTPHookReceiver(
    ARBITRUM_SEPOLIA_CHAIN_ID,
    ARBITRUM_HOOK_RECEIVER
  );
  await tx3.wait();
  console.log("✅ Arbitrum Sepolia hook receiver set");
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  for (const [name, address] of Object.entries(deployedContracts)) {
    const code = await ethers.provider.getCode(address);
    if (code === "0x" || code === "0x00") {
      console.log(`❌ ${name} not deployed properly!`);
    } else {
      console.log(`✅ ${name} verified at ${address}`);
    }
  }
  
  // Save deployment data
  const deploymentData = {
    network: "sepolia",
    chainId: config.chainId,
    deploymentTime: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployedContracts,
    configuration: {
      usdc: config.contracts.usdc,
      cctpTokenMessenger: config.contracts.cctpTokenMessenger,
      cctpMessageTransmitter: config.contracts.cctpMessageTransmitter,
      layerZeroEndpoint: config.contracts.layerZeroEndpoint,
      uniswapV3Router: config.contracts.uniswapV3Router
    }
  };
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const filename = `sepolia-deployment-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log("\n✅ Deployment complete!");
  console.log("=====================================");
  console.log("📄 Deployment data saved to deployments/" + filename);
  console.log("\n📋 Contract Addresses:");
  console.log("├── SwapExecutor:", deployedContracts.SwapExecutor);
  console.log("├── CCTPHookReceiver:", deployedContracts.CCTPHookReceiver);
  console.log("├── RouteProcessor:", deployedContracts.RouteProcessor);
  console.log("├── FeeManager:", deployedContracts.FeeManager);
  console.log("└── StableRouter:", deployedContracts.StableRouter);
  
  console.log("\n🔗 Cross-chain setup:");
  console.log("├── USDC configured for CCTP");
  console.log("├── Base Sepolia hook receiver configured");
  console.log("└── Arbitrum Sepolia hook receiver configured");
  
  console.log("\n📝 Next steps:");
  console.log("1. Fund RouteProcessor with ETH for LayerZero fees");
  console.log("2. Test CCTP transfers");
  console.log("3. Verify contracts on Etherscan");
  
  // Test that we can call the contracts
  console.log("\n🧪 Quick function test...");
  try {
    const isUSDC = await routeProcessor.isUSDC(config.contracts.usdc);
    console.log("✅ Can call isUSDC:", isUSDC);
    
    const owner = await routeProcessor.owner();
    console.log("✅ RouteProcessor owner:", owner);
    
    const routerProcessor = await stableRouter.routeProcessor();
    console.log("✅ StableRouter points to RouteProcessor:", routerProcessor === deployedContracts.RouteProcessor);
  } catch (e) {
    console.log("❌ Error testing functions:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
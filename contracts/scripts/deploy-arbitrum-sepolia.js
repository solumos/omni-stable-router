const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Arbitrum Sepolia Configuration
const ARBITRUM_SEPOLIA_CONFIG = {
  chainId: 421614,
  cctpDomain: 3,  // Arbitrum CCTP domain
  layerZeroId: 10231,  // Arbitrum Sepolia LZ ID
  stargateId: 10231,
  contracts: {
    // CCTP contracts on Arbitrum Sepolia
    cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    
    // LayerZero endpoint on Arbitrum Sepolia
    layerZeroEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f",
    
    // Stargate router (if available)
    stargateRouter: "0x0000000000000000000000000000000000000000", // Not yet deployed
    
    // Uniswap V3 on Arbitrum Sepolia
    uniswapV3Router: "0x101F443B4d1b059569D643917553c771E1b9663E",
    
    // USDC on Arbitrum Sepolia
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  }
};

async function main() {
  console.log("🚀 Starting Arbitrum Sepolia Deployment...\n");
  
  const network = hre.network.name;
  if (network !== "arbitrumSepolia") {
    throw new Error(`Wrong network! Expected arbitrumSepolia, got ${network}`);
  }
  
  const config = ARBITRUM_SEPOLIA_CONFIG;
  
  console.log(`📍 Deploying to Arbitrum Sepolia (chainId: ${config.chainId})`);
  console.log("=====================================\n");
  
  const [deployer] = await ethers.getSigners();
  
  console.log("👤 Deployer address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", formatEther(balance), "ETH\n");
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance. Get testnet ETH from:");
    console.log("https://www.alchemy.com/faucets/arbitrum-sepolia");
    console.log("https://arbiscan.io/");
  }
  
  console.log("📦 Starting deployment...\n");
  
  // Deploy SwapExecutor (not upgradeable)
  console.log("1️⃣ Deploying SwapExecutor...");
  const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy(config.contracts.uniswapV3Router);
  await swapExecutor.waitForDeployment();
  const swapExecutorAddress = await swapExecutor.getAddress();
  console.log("✅ SwapExecutor deployed to:", swapExecutorAddress);
  
  // Note: StargateComposer is not needed if Stargate is not available
  console.log("\n2️⃣ Skipping StargateComposer (Stargate not available on Arbitrum Sepolia)...");
  const stargateComposerAddress = ethers.ZeroAddress;
  
  // Deploy CCTPHookReceiver (not upgradeable)
  console.log("\n3️⃣ Deploying CCTPHookReceiver...");
  const CCTPHookReceiver = await ethers.getContractFactory("CCTPHookReceiver");
  const cctpHookReceiver = await CCTPHookReceiver.deploy(
    swapExecutorAddress,
    config.contracts.cctpMessageTransmitter,
    config.contracts.usdc
  );
  await cctpHookReceiver.waitForDeployment();
  const cctpHookReceiverAddress = await cctpHookReceiver.getAddress();
  console.log("✅ CCTPHookReceiver deployed to:", cctpHookReceiverAddress);
  
  // Note: OFTComposer is not in the codebase, skipping
  console.log("\n4️⃣ Skipping OFTComposer (not implemented)...");
  const oftComposerAddress = ethers.ZeroAddress;
  
  // Deploy RouteProcessor (upgradeable)
  console.log("\n5️⃣ Deploying RouteProcessor (StableRouter)...");
  const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
  const routeProcessor = await upgrades.deployProxy(
    RouteProcessor,
    [
      deployer.address,  // owner (already declared above)
      config.contracts.cctpTokenMessenger,
      config.contracts.cctpMessageTransmitter,
      config.contracts.layerZeroEndpoint,
      config.contracts.stargateRouter  // Can be zero address if not available
    ],
    { initializer: "initialize" }
  );
  await routeProcessor.waitForDeployment();
  const routeProcessorAddress = await routeProcessor.getAddress();
  console.log("✅ RouteProcessor deployed to:", routeProcessorAddress);
  
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
  
  // Set hook receiver for Sepolia
  console.log("\n7️⃣ Setting CCTP hook receiver for Sepolia...");
  const SEPOLIA_CHAIN_ID = 11155111;
  const SEPOLIA_HOOK_RECEIVER = "0xE2ea3f454e12362212b1734eD0218E7691bd985c"; // From Sepolia deployment
  const tx2 = await routeProcessor.setCCTPHookReceiver(
    SEPOLIA_CHAIN_ID,
    SEPOLIA_HOOK_RECEIVER
  );
  await tx2.wait();
  console.log("✅ Sepolia hook receiver set");
  
  // Set hook receiver for Base Sepolia
  console.log("\n8️⃣ Setting CCTP hook receiver for Base Sepolia...");
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const BASE_HOOK_RECEIVER = "0xE2ea3f454e12362212b1734eD0218E7691bd985c"; // From Base deployment
  const tx3 = await routeProcessor.setCCTPHookReceiver(
    BASE_SEPOLIA_CHAIN_ID,
    BASE_HOOK_RECEIVER
  );
  await tx3.wait();
  console.log("✅ Base Sepolia hook receiver set");
  
  // Save deployment data
  const deploymentData = {
    network: "arbitrumSepolia",
    chainId: config.chainId,
    deploymentTime: new Date().toISOString(),
    contracts: {
      SwapExecutor: swapExecutorAddress,
      CCTPHookReceiver: cctpHookReceiverAddress,
      RouteProcessor: routeProcessorAddress
    },
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
  
  fs.writeFileSync(
    path.join(deploymentsDir, "arbitrum-sepolia.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log("\n✅ Deployment complete!");
  console.log("=====================================");
  console.log("📄 Deployment data saved to deployments/arbitrum-sepolia.json");
  console.log("\n📋 Contract Addresses:");
  console.log("├── SwapExecutor:", swapExecutorAddress);
  console.log("├── CCTPHookReceiver:", cctpHookReceiverAddress);
  console.log("└── RouteProcessor (StableRouter):", routeProcessorAddress);
  
  console.log("\n🔗 Cross-chain setup:");
  console.log("├── Sepolia hook receiver configured");
  console.log("└── Base Sepolia hook receiver configured");
  
  console.log("\n📝 Next steps:");
  console.log("1. Verify contracts: npx hardhat run scripts/verify-arbitrum-sepolia.js --network arbitrumSepolia");
  console.log("2. Fund RouteProcessor with ETH for LayerZero fees");
  console.log("3. Test CCTP transfers with scripts/test-cctp-arbitrum.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
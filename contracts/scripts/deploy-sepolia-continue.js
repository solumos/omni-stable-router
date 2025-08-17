const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");
const { formatEther } = require("ethers");
const fs = require("fs");
const path = require("path");

// Already deployed contracts
const DEPLOYED = {
  SwapExecutor: "0x01ef072F9ebDc605209203d5152aE5c33f4a3Ce4",
  CCTPHookReceiver: "0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7"
};

// Sepolia Configuration
const SEPOLIA_CONFIG = {
  chainId: 11155111,
  contracts: {
    cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
    layerZeroEndpoint: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
    stargateRouter: "0x0000000000000000000000000000000000000000",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  }
};

async function main() {
  console.log("🚀 Continuing Sepolia Deployment...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", formatEther(balance), "ETH\n");
  
  console.log("📦 Already deployed:");
  console.log("├── SwapExecutor:", DEPLOYED.SwapExecutor);
  console.log("└── CCTPHookReceiver:", DEPLOYED.CCTPHookReceiver);
  
  const deployedContracts = { ...DEPLOYED };
  
  // Deploy RouteProcessor
  console.log("\n3️⃣ Deploying RouteProcessor...");
  const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
  const routeProcessor = await upgrades.deployProxy(
    RouteProcessor,
    [
      deployer.address,
      SEPOLIA_CONFIG.contracts.cctpTokenMessenger,
      SEPOLIA_CONFIG.contracts.cctpMessageTransmitter,
      SEPOLIA_CONFIG.contracts.layerZeroEndpoint,
      SEPOLIA_CONFIG.contracts.stargateRouter
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
  
  // Deploy StableRouter
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
  
  // Configuration
  console.log("\n⚙️  Configuring contracts...\n");
  
  // Configure USDC
  console.log("Configuring USDC as CCTP token...");
  const tx1 = await routeProcessor.configureToken(
    SEPOLIA_CONFIG.contracts.usdc,
    true,  // isUSDC
    ethers.ZeroAddress,
    0
  );
  await tx1.wait();
  console.log("✅ USDC configured");
  
  // Set hook receivers
  console.log("\nSetting hook receivers...");
  
  // Base Sepolia
  const tx2 = await routeProcessor.setCCTPHookReceiver(
    84532,
    "0xE2ea3f454e12362212b1734eD0218E7691bd985c"
  );
  await tx2.wait();
  console.log("✅ Base Sepolia configured");
  
  // Arbitrum Sepolia
  const tx3 = await routeProcessor.setCCTPHookReceiver(
    421614,
    "0xA0FD978f89D941783A43aFBe092B614ef31571F3"
  );
  await tx3.wait();
  console.log("✅ Arbitrum Sepolia configured");
  
  // Verify
  console.log("\n🔍 Verifying deployment...");
  for (const [name, address] of Object.entries(deployedContracts)) {
    const code = await ethers.provider.getCode(address);
    console.log(`${code !== "0x" ? "✅" : "❌"} ${name}: ${address}`);
  }
  
  // Test functions
  console.log("\n🧪 Testing functions...");
  const isUSDC = await routeProcessor.isUSDC(SEPOLIA_CONFIG.contracts.usdc);
  console.log("USDC configured:", isUSDC);
  
  const routerRP = await stableRouter.routeProcessor();
  console.log("StableRouter → RouteProcessor:", routerRP === deployedContracts.RouteProcessor);
  
  // Save
  const deploymentData = {
    network: "sepolia",
    timestamp: new Date().toISOString(),
    contracts: deployedContracts
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployments/sepolia-complete.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  
  console.log("\n✅ Deployment complete!");
  console.log("=====================================");
  console.log("📋 All Contracts:");
  Object.entries(deployedContracts).forEach(([name, addr]) => {
    console.log(`├── ${name}: ${addr}`);
  });
  
  console.log("\n📝 Test with:");
  console.log("npx hardhat run scripts/test-cctp-with-new-contracts.js --network sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
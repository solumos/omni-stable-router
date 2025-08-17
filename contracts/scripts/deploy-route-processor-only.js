const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying RouteProcessor (non-proxy)...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Deploy RouteProcessor directly (not as proxy for now)
  const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
  
  // First deploy the implementation
  console.log("Deploying implementation...");
  const routeProcessor = await RouteProcessor.deploy();
  await routeProcessor.waitForDeployment();
  
  const address = await routeProcessor.getAddress();
  console.log("✅ RouteProcessor deployed to:", address);
  
  // Verify it exists
  const code = await ethers.provider.getCode(address);
  console.log("Contract deployed:", code !== "0x");
  
  // Now we need to initialize it
  console.log("\nInitializing...");
  const tx = await routeProcessor.initialize(
    deployer.address,
    "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5", // CCTP TokenMessenger
    "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD", // CCTP MessageTransmitter
    "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1", // LayerZero endpoint
    ethers.ZeroAddress // No Stargate on testnet
  );
  await tx.wait();
  console.log("✅ Initialized");
  
  // Configure USDC
  console.log("\nConfiguring USDC...");
  const tx2 = await routeProcessor.configureToken(
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC
    true,
    ethers.ZeroAddress,
    0
  );
  await tx2.wait();
  console.log("✅ USDC configured");
  
  // Test
  const isUSDC = await routeProcessor.isUSDC("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
  console.log("USDC check:", isUSDC);
  
  console.log("\n📋 RouteProcessor ready at:", address);
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
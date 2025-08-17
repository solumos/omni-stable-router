const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Configuring Arbitrum Sepolia -> Base Sepolia route...\n");
  
  const routerAddress = "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  const arbToBaseRoute = {
    protocol: 1, // CCTP
    protocolDomain: 6, // Base Sepolia CCTP domain
    bridgeContract: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5", // CCTP TokenMessenger
    poolId: 0,
    swapPool: ethers.ZeroAddress,
    extraData: "0x"
  };
  
  const tx = await router.configureRoute(
    "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Arbitrum USDC
    421614,                                         // Arbitrum Sepolia
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base USDC
    84532,                                          // Base Sepolia
    arbToBaseRoute
  );
  
  await tx.wait();
  console.log("✅ Arbitrum -> Base route configured!");
  
  // Verify
  const isConfigured = await router.isRouteConfigured(
    "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    421614,
    "0x036CbD53842c5426634e7929541eC2318f3dCF7e", 
    84532
  );
  
  console.log("Route verified:", isConfigured);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
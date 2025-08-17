const { ethers } = require("hardhat");

async function main() {
  const routerAddress = "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  console.log("Checking protocol contracts on", hre.network.name);
  console.log("Router:", routerAddress);
  
  // Check CCTP
  const cctpMessenger = await router.protocolContracts(1); // Protocol.CCTP
  console.log("\nCCTP TokenMessenger:", cctpMessenger);
  
  // Check if it's set
  if (cctpMessenger === "0x0000000000000000000000000000000000000000") {
    console.log("❌ CCTP not configured!");
    
    // Set it
    console.log("\nSetting CCTP TokenMessenger...");
    const CCTP_TOKEN_MESSENGER = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"; // Base mainnet
    const tx = await router.setProtocolContract(1, CCTP_TOKEN_MESSENGER);
    await tx.wait();
    console.log("✅ CCTP configured");
  } else {
    console.log("✅ CCTP already configured");
  }
  
  // Check route
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  const routeKey = await router.getRouteKey(
    USDC_BASE,
    84539, // Base chain ID
    USDC_ARB,
    9924  // Arbitrum chain ID
  );
  
  const route = await router.routes(routeKey);
  console.log("\nRoute details:");
  console.log("  Protocol:", route.protocol);
  console.log("  Domain:", route.protocolDomain);
  console.log("  Bridge:", route.bridgeContract);
  
  // Check mock swap executor address from deployment
  const deploymentPath = `./deployments/tenderly-base.json`;
  const fs = require('fs');
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log("\nMock Swap Executor:", deployment.contracts.MockSwapExecutor || "Not deployed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
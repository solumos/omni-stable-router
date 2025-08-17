const { ethers } = require("hardhat");

async function main() {
  console.log("Configuring basic CCTP routes for USDC transfers...\n");
  
  const routerAddress = "0x6e572fb734be64ec1465d1472ed40f41b74dd83e";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  console.log("Router:", routerAddress);
  
  // Configure CCTP protocol - use a dummy address for now
  console.log("\n1️⃣ Configuring CCTP protocol...");
  const dummyCctpAddress = "0x1111111111111111111111111111111111111111";
  
  try {
    const tx1 = await router.setProtocolContract(1, dummyCctpAddress); // CCTP = protocol 1
    await tx1.wait();
    console.log("  ✅ CCTP protocol configured");
  } catch (e) {
    console.log("  ❌ Error configuring CCTP:", e.message);
  }
  
  // Configure a basic USDC same-chain route (for testing)
  console.log("\n2️⃣ Configuring USDC same-chain route...");
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Define the route struct for same-chain CCTP (should work)
  const samechainRoute = {
    protocol: 1,                    // CCTP
    protocolDomain: 0,              // Same domain
    bridgeContract: dummyCctpAddress, // CCTP contract address
    poolId: 0,                      // Not used for CCTP
    swapPool: ethers.ZeroAddress,   // Not used for same-token transfers
    extraData: "0x"                 // No extra data for CCTP
  };
  
  try {
    const tx2 = await router.configureRoute(
      USDC_BASE,    // fromToken
      31337,        // fromChainId (same chain)  
      USDC_BASE,    // toToken (same token)
      31337,        // toChainId (same chain)
      samechainRoute // route struct
    );
    await tx2.wait();
    console.log("  ✅ USDC same-chain route configured");
  } catch (e) {
    console.log("  ❌ Error configuring same-chain route:", e.message);
  }
  
  // Also configure cross-chain route to 31338 (though 31338 is same as 31337)
  console.log("\n3️⃣ Configuring USDC cross-chain route...");
  const crosschainRoute = {
    protocol: 1,                    // CCTP
    protocolDomain: 2,              // Different domain for testing
    bridgeContract: dummyCctpAddress, // CCTP contract address
    poolId: 0,                      // Not used for CCTP
    swapPool: ethers.ZeroAddress,   // Not used for same-token transfers
    extraData: "0x"                 // No extra data for CCTP
  };
  
  try {
    const tx3 = await router.configureRoute(
      USDC_BASE,    // fromToken
      31337,        // fromChainId
      USDC_BASE,    // toToken (same token, testing cross-chain)
      31338,        // toChainId (simulated different chain)
      crosschainRoute // route struct
    );
    await tx3.wait();
    console.log("  ✅ USDC cross-chain route configured");
  } catch (e) {
    console.log("  ❌ Error configuring cross-chain route:", e.message);
  }
  
  // Verify routes
  console.log("\n4️⃣ Verifying routes...");
  try {
    const configured1 = await router.isRouteConfigured(USDC_BASE, 31337, USDC_BASE, 31337);
    const configured2 = await router.isRouteConfigured(USDC_BASE, 31337, USDC_BASE, 31338);
    console.log("  📍 USDC 31337->31337:", configured1);
    console.log("  📍 USDC 31337->31338:", configured2);
  } catch (e) {
    console.log("  ❌ Error verifying routes:", e.message);
  }
  
  console.log("\n✅ Basic route configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
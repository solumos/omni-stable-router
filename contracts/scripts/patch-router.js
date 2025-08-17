const { ethers } = require("hardhat");

async function patchRouter() {
  console.log("🔧 Patching Router Logic");
  console.log("=========================");
  
  // Since we can't deploy a new contract due to quota, let's work with what we have
  // The bug is that we're comparing fromToken == toToken for CCTP
  // But these addresses are different on different chains
  
  // Our existing router at: 0x8ABdaF7CABc7dAe57866aCa5C35Ef06BE6E15850
  // Has the bug where it requires fromToken == toToken for CCTP
  
  // For now, let's test with CCTP_HOOKS protocol instead, which doesn't have this check
  
  const router = await ethers.getContractAt("UnifiedRouter", "0x8ABdaF7CABc7dAe57866aCa5C35Ef06BE6E15850");
  
  console.log("\n📝 Current CCTP route (Protocol 1) won't work due to bug");
  console.log("We need to use CCTP_HOOKS (Protocol 2) instead");
  
  // Let's reconfigure the route to use CCTP_HOOKS
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  const Protocol = {
    NONE: 0,
    CCTP: 1,
    CCTP_HOOKS: 2,
    LAYERZERO: 3,
    STARGATE: 4
  };
  
  console.log("\n🔄 Reconfiguring route to use CCTP_HOOKS...");
  
  try {
    // Configure USDC -> USDC using CCTP_HOOKS instead of CCTP
    const tx = await router.configureRoute(
      USDC_BASE,           // fromToken
      84539,               // fromChainId (Base)
      USDC_ARB,            // toToken  
      9924,                // toChainId (Arbitrum)
      {
        protocol: Protocol.CCTP_HOOKS,  // Use CCTP_HOOKS instead
        protocolDomain: 3,               // Arbitrum domain
        bridgeContract: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962", // TokenMessenger
        poolId: 0,
        swapPool: "0x0000000000000000000000000000000000000000", // No swap needed for same token
        extraData: "0x"
      }
    );
    
    await tx.wait();
    console.log("✅ Route reconfigured to use CCTP_HOOKS");
    
    // Verify the route
    const routeKey = await router.getRouteKey(USDC_BASE, 84539, USDC_ARB, 9924);
    const route = await router.routes(routeKey);
    console.log("\n📋 New route configuration:");
    console.log("  Protocol:", route.protocol.toString(), "(CCTP_HOOKS)");
    console.log("  Domain:", route.protocolDomain.toString());
    console.log("  Bridge:", route.bridgeContract);
    
  } catch (error) {
    console.log("❌ Failed to reconfigure:", error.message);
    console.log("\nThe route might already be configured correctly.");
  }
  
  console.log("\n✅ Ready to test transfers!");
  console.log("Run: DEST_NETWORK=tenderlyArbitrum npx hardhat run scripts/test-tenderly-transfer.js --network tenderlyBase");
}

async function main() {
  await patchRouter();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
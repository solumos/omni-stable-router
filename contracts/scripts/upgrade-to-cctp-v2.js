const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 UPGRADING TO CCTP V2 FAST TRANSFERS");
  console.log("======================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  // CCTP V2 Addresses
  const CCTP_V2 = {
    8453: { // Base
      tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      domain: 6
    },
    42161: { // Arbitrum
      tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitter: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
      domain: 3
    }
  };
  
  const USDC_ADDRESSES = {
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" // Arbitrum
  };
  
  const ROUTER_ADDRESSES = {
    8453: "0xD1e60637cA70C786B857452E50DE8353a01DabBb", // Base
    42161: "0xD1e60637cA70C786B857452E50DE8353a01DabBb" // Arbitrum - same address as Base
  };
  
  if (!CCTP_V2[chainId]) {
    console.log("❌ Network not supported");
    return;
  }
  
  const chainName = chainId === 8453 ? "Base" : "Arbitrum";
  const otherChainId = chainId === 8453 ? 42161 : 8453;
  const otherChainName = chainId === 8453 ? "Arbitrum" : "Base";
  
  console.log("📍 Upgrading on " + chainName + " (Chain " + chainId + ")");
  console.log("🎯 Target: " + otherChainName + " (Chain " + otherChainId + ")\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Signer: " + signer.address + "\n");
  
  const routerAddress = ROUTER_ADDRESSES[chainId];
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Check current owner
  const owner = await router.owner();
  console.log("📊 Router Owner: " + owner);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ You are not the owner. Only " + owner + " can update routes.");
    return;
  }
  
  console.log("✅ Owner verified\n");
  
  // Configure CCTP V2 route
  console.log("⚙️  CONFIGURING CCTP V2 ROUTE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const route = {
    protocol: 1, // Protocol.CCTP
    protocolDomain: CCTP_V2[otherChainId].domain,
    bridgeContract: CCTP_V2[chainId].tokenMessenger, // V2 TokenMessenger
    poolId: 0,
    swapPool: ethers.ZeroAddress,
    extraData: "0x"
  };
  
  console.log("\n📋 New CCTP V2 Route Configuration:");
  console.log("   From Token: USDC (" + USDC_ADDRESSES[chainId] + ")");
  console.log("   From Chain: " + chainName + " (" + chainId + ")");
  console.log("   To Token: USDC (" + USDC_ADDRESSES[otherChainId] + ")");
  console.log("   To Chain: " + otherChainName + " (" + otherChainId + ")");
  console.log("   Protocol: CCTP (1)");
  console.log("   Domain: " + route.protocolDomain);
  console.log("   Bridge: " + route.bridgeContract + " (V2 TokenMessenger)");
  
  console.log("\n🔄 Updating route configuration...");
  
  try {
    const tx = await router.configureRoute(
      USDC_ADDRESSES[chainId],
      chainId,
      USDC_ADDRESSES[otherChainId],
      otherChainId,
      route
    );
    
    console.log("\n📤 Transaction sent: " + tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block " + receipt.blockNumber);
    
    // Also update the protocol contract mapping for CCTP_HOOKS if needed
    console.log("\n⚙️  UPDATING PROTOCOL CONTRACTS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    console.log("🔄 Setting MessageTransmitter for CCTP_HOOKS...");
    const tx2 = await router.setProtocolContract(
      2, // Protocol.CCTP_HOOKS
      CCTP_V2[chainId].messageTransmitter
    );
    
    console.log("📤 Transaction sent: " + tx2.hash);
    const receipt2 = await tx2.wait();
    console.log("✅ MessageTransmitter updated in block " + receipt2.blockNumber);
    
  } catch (error) {
    console.log("\n❌ Failed to update route:", error.message);
    return;
  }
  
  // Verify the update
  console.log("\n\n🔍 VERIFYING UPGRADE");
  console.log("━━━━━━━━━━━━━━━━━━━");
  
  const routeKey = await router.getRouteKey(
    USDC_ADDRESSES[chainId],
    chainId,
    USDC_ADDRESSES[otherChainId],
    otherChainId
  );
  
  const updatedRoute = await router.routes(routeKey);
  
  console.log("\n📊 Updated Route Configuration:");
  console.log("   Protocol: " + updatedRoute.protocol);
  console.log("   Domain: " + updatedRoute.protocolDomain);
  console.log("   Bridge: " + updatedRoute.bridgeContract);
  
  if (updatedRoute.bridgeContract === CCTP_V2[chainId].tokenMessenger) {
    console.log("\n✅ CCTP V2 UPGRADE SUCCESSFUL!");
    console.log("\n🎉 BENEFITS ENABLED:");
    console.log("   ⚡ Fast transfers: 8-20 seconds (vs 10-20 minutes)");
    console.log("   🔄 Automated attestation via relayer");
    console.log("   💰 Lower opportunity cost for users");
    console.log("   🚀 Better user experience");
    
    console.log("\n📝 NEXT STEPS:");
    console.log("   1. Test with a small USDC transfer");
    console.log("   2. Monitor with relayer for fast completion");
    console.log("   3. Update the other chain's router similarly");
    
    console.log("\n🧪 TEST COMMAND:");
    const networkCmd = chainName.toLowerCase();
    console.log("   npx hardhat run scripts/execute-cctp-transfer.js --network " + networkCmd);
    
  } else {
    console.log("\n⚠️  Route update may not have completed properly");
    console.log("   Please verify manually");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

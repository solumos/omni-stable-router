const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 DEBUGGING PROTOCOL CONFIGURATION");
  console.log("===================================\n");
  
  const routerAddress = "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3";
  const [signer] = await ethers.getSigners();
  
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🌉 Router: ${routerAddress}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Check ownership
  console.log("🔍 Checking Contract Ownership...");
  try {
    const owner = await router.owner();
    console.log(`   Contract Owner: ${owner}`);
    console.log(`   Current Signer: ${signer.address}`);
    console.log(`   Is Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}`);
  } catch (e) {
    console.log("❌ Failed to check ownership:", e.message);
  }
  
  // Check if contract is paused
  console.log("\n🔍 Checking Contract State...");
  try {
    const paused = await router.paused();
    console.log(`   Contract Paused: ${paused}`);
  } catch (e) {
    console.log("❌ Failed to check paused state:", e.message);
  }
  
  // Test static call to see why it's failing
  console.log("\n🧪 Testing Static Call for CCTP...");
  try {
    await router.setProtocolContract.staticCall(
      1, // Protocol.CCTP
      "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"
    );
    console.log("✅ CCTP static call successful");
  } catch (e) {
    console.log("❌ CCTP static call failed:", e.message);
    
    // Try to decode the error
    if (e.data) {
      try {
        const iface = router.interface;
        const decoded = iface.parseError(e.data);
        console.log("🔍 Decoded error:", decoded.name, decoded.args);
      } catch (decodeErr) {
        console.log("🔍 Raw error data:", e.data);
      }
    }
  }
  
  // Test static call for LayerZero
  console.log("\n🧪 Testing Static Call for LayerZero...");
  try {
    await router.setProtocolContract.staticCall(
      3, // Protocol.LAYERZERO
      "0x1a44076050125825900e736c501f859c50fE728c"
    );
    console.log("✅ LayerZero static call successful");
  } catch (e) {
    console.log("❌ LayerZero static call failed:", e.message);
    
    // Try to decode the error
    if (e.data) {
      try {
        const iface = router.interface;
        const decoded = iface.parseError(e.data);
        console.log("🔍 Decoded error:", decoded.name, decoded.args);
      } catch (decodeErr) {
        console.log("🔍 Raw error data:", e.data);
      }
    }
  }
  
  // Check current protocol contracts
  console.log("\n🔍 Current Protocol Contracts...");
  for (let i = 0; i <= 4; i++) {
    try {
      const contract = await router.protocolContracts(i);
      console.log(`   Protocol ${i}: ${contract}`);
    } catch (e) {
      console.log(`   Protocol ${i}: Error - ${e.message}`);
    }
  }
  
  // Test with a zero address first (should fail with "Invalid address")
  console.log("\n🧪 Testing with Zero Address (should fail with 'Invalid address')...");
  try {
    await router.setProtocolContract.staticCall(
      1,
      ethers.ZeroAddress
    );
    console.log("⚠️  Zero address call unexpectedly succeeded");
  } catch (e) {
    console.log("✅ Zero address correctly rejected:", e.message);
  }
  
  // Test with Protocol.NONE (should fail with "Invalid protocol")
  console.log("\n🧪 Testing with Protocol.NONE (should fail with 'Invalid protocol')...");
  try {
    await router.setProtocolContract.staticCall(
      0, // Protocol.NONE
      "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"
    );
    console.log("⚠️  Protocol.NONE call unexpectedly succeeded");
  } catch (e) {
    console.log("✅ Protocol.NONE correctly rejected:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
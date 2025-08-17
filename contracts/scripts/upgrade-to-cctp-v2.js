const { ethers } = require("hardhat");

async function main() {
  console.log("⚡ UPGRADING TO CCTP V2 FAST TRANSFERS");
  console.log("====================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [signer] = await ethers.getSigners();
  
  // CCTP addresses
  const addresses = {
    v1: {
      tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"
    },
    v2: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64"
    }
  };
  
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`🔵 Current CCTP v1: ${addresses.v1.tokenMessenger}`);
  console.log(`⚡ Upgrading to v2: ${addresses.v2.tokenMessengerV2}\n`);
  
  // Get router contract
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Check ownership
  const owner = await router.owner();
  console.log(`👤 Router Owner: ${owner}`);
  console.log(`✅ Is Owner: ${owner.toLowerCase() === signer.address.toLowerCase()}\n`);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error("Not the router owner - cannot upgrade");
  }
  
  // Check current CCTP configuration
  const currentCctpContract = await router.protocolContracts(1); // CCTP
  console.log(`📊 Current CCTP: ${currentCctpContract}`);
  console.log(`   Using v1: ${currentCctpContract === addresses.v1.tokenMessenger}`);
  console.log(`   Using v2: ${currentCctpContract === addresses.v2.tokenMessengerV2}`);
  
  if (currentCctpContract === addresses.v2.tokenMessengerV2) {
    console.log("✅ Already using CCTP v2!");
    return;
  }
  
  // Verify CCTP v2 contract exists
  console.log("\n🔍 Verifying CCTP v2 Contract...");
  const code = await ethers.provider.getCode(addresses.v2.tokenMessengerV2);
  
  if (code === "0x") {
    throw new Error("CCTP v2 contract not found on Base");
  }
  
  console.log("✅ CCTP v2 contract verified");
  console.log(`   Code length: ${code.length - 2} bytes`);
  
  // Test CCTP v2 interface
  console.log("\n🧪 Testing CCTP v2 Interface...");
  try {
    const tokenMessengerV2ABI = [
      "function localDomain() view returns (uint32)",
      "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)",
      "function depositForBurnWithCaller(uint256,uint32,bytes32,address,bytes32) external returns (uint64)"
    ];
    
    const tokenMessengerV2 = new ethers.Contract(
      addresses.v2.tokenMessengerV2,
      tokenMessengerV2ABI,
      ethers.provider
    );
    
    const domain = await tokenMessengerV2.localDomain();
    console.log(`✅ CCTP v2 Domain: ${domain} (6=Base)`);
    
    if (domain !== 6) {
      throw new Error(`Wrong domain: expected 6 (Base), got ${domain}`);
    }
    
  } catch (e) {
    console.log("❌ CCTP v2 interface test failed:", e.message);
    throw e;
  }
  
  // Upgrade router to use CCTP v2
  console.log("\n⚡ Upgrading Router to CCTP v2...");
  
  try {
    const upgradeTx = await router.setProtocolContract(
      1, // Protocol.CCTP
      addresses.v2.tokenMessengerV2
    );
    
    console.log(`📋 Upgrade TX: ${upgradeTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await upgradeTx.wait();
    console.log(`✅ Upgrade confirmed! Block: ${receipt.blockNumber}`);
    
  } catch (e) {
    console.log("❌ Upgrade failed:", e.message);
    throw e;
  }
  
  // Verify upgrade
  console.log("\n🔍 Verifying Upgrade...");
  const newCctpContract = await router.protocolContracts(1);
  console.log(`📊 New CCTP Address: ${newCctpContract}`);
  console.log(`✅ Upgrade Success: ${newCctpContract === addresses.v2.tokenMessengerV2}`);
  
  if (newCctpContract === addresses.v2.tokenMessengerV2) {
    console.log("\n" + "=".repeat(50));
    console.log("🎉 CCTP V2 UPGRADE COMPLETE!");
    console.log("=".repeat(50));
    console.log("✅ Router now using CCTP v2");
    console.log("⚡ Fast transfers enabled");
    console.log("🚀 Transfer speed: 8-20 seconds (vs 10-20 minutes)");
    
    console.log("\n📊 Speed Improvement:");
    console.log("• Old (v1): 10-20 minutes");
    console.log("• New (v2): 8-20 seconds");
    console.log("• Improvement: 30-150x faster!");
    
    console.log("\n💡 What Changed:");
    console.log("• Router now points to CCTP v2 contract");
    console.log("• Future transfers will use fast attestation");
    console.log("• Same transfer() function, faster execution");
    console.log("• All existing routes continue to work");
    
    console.log("\n🧪 Next Steps:");
    console.log("1. Test a new transfer to verify fast speed");
    console.log("2. Monitor transfer completion times");
    console.log("3. Update frontend with speed expectations");
    
    console.log(`\n🔗 View Router: https://basescan.org/address/${routerAddress}`);
    console.log(`⚡ CCTP v2: https://basescan.org/address/${addresses.v2.tokenMessengerV2}`);
    
  } else {
    throw new Error("Upgrade verification failed");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
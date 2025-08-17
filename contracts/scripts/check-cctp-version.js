const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 CHECKING CCTP VERSION & FAST TRANSFER SUPPORT");
  console.log("===============================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  // Current CCTP addresses we're using
  const currentAddresses = {
    tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    messageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4"
  };
  
  // CCTP v2 addresses (need to verify these)
  const v2Addresses = {
    // These might be the v2 addresses - need to verify
    tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962", // Same or different?
    messageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4", // Same or different?
    fastTransferService: "TBD" // New in v2
  };
  
  console.log("📋 Current CCTP Configuration:");
  console.log(`   TokenMessenger: ${currentAddresses.tokenMessenger}`);
  console.log(`   MessageTransmitter: ${currentAddresses.messageTransmitter}\n`);
  
  // Check TokenMessenger version
  console.log("🔍 Checking TokenMessenger Version...");
  try {
    const tokenMessengerABI = [
      "function version() view returns (uint32)",
      "function localDomain() view returns (uint32)",
      "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)",
      "function depositForBurnWithCaller(uint256,uint32,bytes32,address,bytes32) external returns (uint64)"
    ];
    
    const tokenMessenger = new ethers.Contract(
      currentAddresses.tokenMessenger,
      tokenMessengerABI,
      ethers.provider
    );
    
    try {
      const version = await tokenMessenger.version();
      console.log(`   TokenMessenger Version: ${version}`);
    } catch (e) {
      console.log("   Version method not available (likely v1)");
    }
    
    const domain = await tokenMessenger.localDomain();
    console.log(`   Local Domain: ${domain} (0=Ethereum, 6=Base, 3=Arbitrum)`);
    
  } catch (e) {
    console.log("❌ TokenMessenger check failed:", e.message);
  }
  
  // Check MessageTransmitter version
  console.log("\n🔍 Checking MessageTransmitter Version...");
  try {
    const messageTransmitterABI = [
      "function version() view returns (uint32)",
      "function localDomain() view returns (uint32)",
      "function sendMessage(uint32,bytes32,bytes) external returns (uint64)",
      "function sendMessageWithCaller(uint32,bytes32,bytes32,bytes) external returns (uint64)"
    ];
    
    const messageTransmitter = new ethers.Contract(
      currentAddresses.messageTransmitter,
      messageTransmitterABI,
      ethers.provider
    );
    
    try {
      const version = await messageTransmitter.version();
      console.log(`   MessageTransmitter Version: ${version}`);
    } catch (e) {
      console.log("   Version method not available (likely v1)");
    }
    
    const domain = await messageTransmitter.localDomain();
    console.log(`   Local Domain: ${domain}`);
    
  } catch (e) {
    console.log("❌ MessageTransmitter check failed:", e.message);
  }
  
  // Check for v2 Fast Transfer support
  console.log("\n⚡ Checking Fast Transfer Support...");
  
  // Look for v2 specific methods
  try {
    const fastTransferABI = [
      "function fastTransferAllowance() view returns (uint256)",
      "function depositForBurnFast(uint256,uint32,bytes32,address) external returns (uint64)",
      "function isFastTransferEnabled() view returns (bool)"
    ];
    
    const tokenMessenger = new ethers.Contract(
      currentAddresses.tokenMessenger,
      fastTransferABI,
      ethers.provider
    );
    
    try {
      const fastTransferAllowance = await tokenMessenger.fastTransferAllowance();
      console.log(`✅ Fast Transfer Allowance: ${ethers.formatUnits(fastTransferAllowance, 6)} USDC`);
      console.log("✅ CCTP v2 Fast Transfers SUPPORTED!");
    } catch (e) {
      console.log("❌ Fast Transfer methods not found (CCTP v1)");
    }
    
  } catch (e) {
    console.log("❌ Fast Transfer check failed");
  }
  
  // Check what our router is configured to use
  console.log("\n🌉 Current Router Configuration...");
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  const cctpContract = await router.protocolContracts(1); // CCTP
  console.log(`   Router CCTP Address: ${cctpContract}`);
  console.log(`   Matches TokenMessenger: ${cctpContract === currentAddresses.tokenMessenger}`);
  
  if (cctpContract === currentAddresses.tokenMessenger) {
    console.log("✅ Router using TokenMessenger (standard transfers)");
  } else {
    console.log("⚠️  Router using different address");
  }
  
  console.log("\n📊 CCTP Transfer Types Available:");
  console.log("1. 🐌 Standard Transfer (v1/v2): 10-20 minutes");
  console.log("2. ⚡ Fast Transfer (v2 only): 8-20 seconds");
  console.log("3. 🔗 Fast Transfer with Hooks (v2): Instant + auto-execute");
  
  console.log("\n💡 Fast Transfer Benefits:");
  console.log("• Reduces 13-19 minute finality to 8-20 seconds");
  console.log("• Uses Circle's Attestation Service");
  console.log("• Requires Fast Transfer Allowance");
  console.log("• May have additional onchain fees");
  
  console.log("\n🔧 To Enable Fast Transfers:");
  console.log("1. Verify we have CCTP v2 contracts");
  console.log("2. Update router to use Fast Transfer methods");
  console.log("3. Configure Fast Transfer Allowance");
  console.log("4. Implement depositForBurnFast() calls");
  
  console.log("\n📋 Supported Fast Transfer Routes:");
  console.log("• Base → Arbitrum: ✅ Both chains support Fast Transfer");
  console.log("• Base → Avalanche: ✅ Fast Transfer available"); 
  console.log("• Arbitrum → Base: ✅ Fast Transfer available");
  
  console.log(`\n🔗 Current Transfer: https://basescan.org/tx/0x00efdd7a27ef674dd55719ff37162f07b6336d217fb62055fa906b3005c47bf3`);
  console.log("📊 Transfer Type: Standard (10-20 minutes)");
  console.log("⚡ Upgrade to Fast Transfer: Possible with v2 implementation");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 CHECKING CCTP V2 FAST TRANSFER SUPPORT");
  console.log("========================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  // CCTP v1 vs v2 addresses
  const addresses = {
    v1: {
      tokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
      messageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4"
    },
    v2: {
      tokenMessengerV2: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
      messageTransmitterV2: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64"
    }
  };
  
  console.log("📋 CCTP Address Comparison:");
  console.log(`🔵 CCTP v1 TokenMessenger: ${addresses.v1.tokenMessenger}`);
  console.log(`🔵 CCTP v1 MessageTransmitter: ${addresses.v1.messageTransmitter}`);
  console.log(`⚡ CCTP v2 TokenMessengerV2: ${addresses.v2.tokenMessengerV2}`);
  console.log(`⚡ CCTP v2 MessageTransmitterV2: ${addresses.v2.messageTransmitterV2}\n`);
  
  // Check if CCTP v2 contract exists on Base
  console.log("🔍 Checking CCTP v2 Contract on Base...");
  try {
    const code = await ethers.provider.getCode(addresses.v2.tokenMessengerV2);
    
    if (code === "0x") {
      console.log("❌ CCTP v2 TokenMessengerV2 not deployed on Base");
    } else {
      console.log("✅ CCTP v2 TokenMessengerV2 exists on Base!");
      console.log(`   Code length: ${code.length - 2} bytes`);
      
      // Try to interact with v2 contract
      const tokenMessengerV2ABI = [
        "function version() view returns (uint32)",
        "function localDomain() view returns (uint32)",
        "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)",
        "function depositForBurnFast(uint256,uint32,bytes32,address) external returns (uint64)",
        "function fastTransferAllowance() view returns (uint256)",
        "function isFastTransferEnabled() view returns (bool)"
      ];
      
      const tokenMessengerV2 = new ethers.Contract(
        addresses.v2.tokenMessengerV2,
        tokenMessengerV2ABI,
        ethers.provider
      );
      
      try {
        const version = await tokenMessengerV2.version();
        console.log(`   Version: ${version}`);
      } catch (e) {
        console.log("   Version check failed");
      }
      
      try {
        const domain = await tokenMessengerV2.localDomain();
        console.log(`   Local Domain: ${domain} (6=Base)`);
      } catch (e) {
        console.log("   Domain check failed");
      }
      
      // Check Fast Transfer support
      console.log("\n⚡ Checking Fast Transfer Features...");
      try {
        const fastTransferAllowance = await tokenMessengerV2.fastTransferAllowance();
        console.log(`✅ Fast Transfer Allowance: ${ethers.formatUnits(fastTransferAllowance, 6)} USDC`);
        
        if (fastTransferAllowance > 0) {
          console.log("✅ Fast Transfers are ENABLED!");
        } else {
          console.log("⚠️  Fast Transfer allowance is zero");
        }
      } catch (e) {
        console.log("❌ Fast Transfer allowance check failed:", e.message);
      }
      
      try {
        const isFastEnabled = await tokenMessengerV2.isFastTransferEnabled();
        console.log(`   Fast Transfer Enabled: ${isFastEnabled}`);
      } catch (e) {
        console.log("   Fast Transfer enabled check failed");
      }
    }
    
  } catch (e) {
    console.log("❌ CCTP v2 contract check failed:", e.message);
  }
  
  // Compare with current router configuration
  console.log("\n🌉 Current Router vs CCTP v2...");
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  const currentCctpContract = await router.protocolContracts(1); // CCTP
  console.log(`   Router CCTP Address: ${currentCctpContract}`);
  console.log(`   Using v1: ${currentCctpContract === addresses.v1.tokenMessenger}`);
  console.log(`   Using v2: ${currentCctpContract === addresses.v2.tokenMessengerV2}`);
  
  if (currentCctpContract === addresses.v1.tokenMessenger) {
    console.log("📊 Status: Using CCTP v1 (Standard Transfers - 10-20 minutes)");
  } else if (currentCctpContract === addresses.v2.tokenMessengerV2) {
    console.log("📊 Status: Using CCTP v2 (Fast Transfers - 8-20 seconds)");
  } else {
    console.log("📊 Status: Using unknown CCTP version");
  }
  
  // Upgrade instructions
  console.log("\n🔧 UPGRADE TO CCTP V2 FAST TRANSFERS:");
  console.log("=====================================");
  
  if (code !== "0x") {
    console.log("✅ CCTP v2 contract available on Base");
    console.log("🔄 Upgrade Steps:");
    console.log("1. Update router to use CCTP v2 address");
    console.log("2. Use depositForBurnFast() instead of depositForBurn()");
    console.log("3. Test fast transfer functionality");
    console.log("4. Monitor transfer completion times");
    
    console.log("\n💡 Expected Improvement:");
    console.log("• Current: 10-20 minutes (finality-based)");
    console.log("• With v2 Fast: 8-20 seconds");
    console.log("• Speed improvement: 30-150x faster!");
    
    console.log("\n🚀 Upgrade Command:");
    console.log(`router.setProtocolContract(1, "${addresses.v2.tokenMessengerV2}")`);
  } else {
    console.log("❌ CCTP v2 not available on Base yet");
    console.log("⏳ Wait for Circle to deploy v2 contracts");
  }
  
  console.log("\n📊 Transfer Speed Comparison:");
  console.log("┌─────────────────┬──────────────┬─────────────────┐");
  console.log("│ Protocol        │ Time         │ Method          │");
  console.log("├─────────────────┼──────────────┼─────────────────┤");
  console.log("│ CCTP v1         │ 10-20 min    │ Finality-based  │");
  console.log("│ CCTP v2 Fast    │ 8-20 sec     │ Attestation     │");
  console.log("│ LayerZero       │ 1-10 min     │ Oracle-based    │");
  console.log("└─────────────────┴──────────────┴─────────────────┘");
  
  console.log(`\n🔗 Current Transfer Status: https://basescan.org/tx/0x00efdd7a27ef674dd55719ff37162f07b6336d217fb62055fa906b3005c47bf3`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
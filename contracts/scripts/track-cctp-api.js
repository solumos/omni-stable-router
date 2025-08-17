const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 TRACKING CCTP TRANSFER VIA CIRCLE API");
  console.log("=======================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const txHash = "0xcbcf2f866890dffbe2e2ef19b3f5950066559783da5fb11557f2516240c89244";
  const baseDomainId = 6; // Base domain ID
  
  console.log(`📋 Transaction: ${txHash}`);
  console.log(`🌐 Source Domain: ${baseDomainId} (Base)`);
  console.log(`🎯 Destination Domain: 3 (Arbitrum)\n`);
  
  // Use Circle's CCTP API
  const cctpApiBase = "https://iris-api.circle.com"; // Mainnet
  
  try {
    console.log("🔍 Checking CCTP API for transfer status...");
    
    // First try the v1 endpoint
    const v1Url = `${cctpApiBase}/v1/messages/${baseDomainId}/${txHash}`;
    console.log(`📡 API Call: ${v1Url}`);
    
    const response = await fetch(v1Url);
    
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        console.log("🔍 Transfer not found in API yet...");
        console.log("⏳ This could mean:");
        console.log("   1. Transfer is still being processed");
        console.log("   2. API hasn't indexed the transaction yet");
        console.log("   3. Transaction may not be a valid CCTP transfer");
      }
      return;
    }
    
    const data = await response.json();
    console.log("✅ CCTP Transfer Found!\n");
    
    console.log("📊 Transfer Details:");
    console.log(JSON.stringify(data, null, 2));
    
    // Check if attestation is available
    if (data.attestation) {
      console.log("\n✅ Attestation Available!");
      console.log("🚀 Transfer ready to be completed on Arbitrum");
      
      // Check completion status
      if (data.state === "COMPLETED") {
        console.log("✅ Transfer COMPLETED!");
      } else if (data.state === "PENDING_CONFIRMATIONS") {
        console.log("⏳ Transfer pending confirmations...");
      } else {
        console.log(`📊 Current State: ${data.state}`);
      }
    } else {
      console.log("\n⏳ Attestation not yet available");
      console.log("🔄 Still processing...");
    }
    
  } catch (error) {
    console.log(`❌ API Error: ${error.message}`);
    
    // Fallback: check transaction locally
    console.log("\n🔄 Fallback: Checking transaction locally...");
    
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    if (receipt) {
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      const txTime = new Date(block.timestamp * 1000);
      const now = new Date();
      const elapsed = Math.floor((now - txTime) / 1000);
      
      console.log(`✅ Transaction confirmed at: ${txTime.toISOString()}`);
      console.log(`⏰ Elapsed time: ${elapsed} seconds`);
      
      if (elapsed < 600) { // Less than 10 minutes
        console.log("⏳ Still within normal CCTP timeframe");
        console.log("💡 CCTP transfers typically take 10-20 minutes");
      } else {
        console.log("⚠️  Transfer taking longer than usual");
        console.log("🔍 May need manual investigation");
      }
      
      // Check which CCTP contract was actually used
      const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
      const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
      const cctpContract = await router.protocolContracts(1);
      
      console.log(`\n🔍 Router Configuration:`);
      console.log(`   CCTP Contract: ${cctpContract}`);
      
      const v1Address = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
      const v2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
      
      if (cctpContract === v1Address) {
        console.log(`   ✅ Using CCTP v1 (standard speed)`);
        console.log(`   ⏰ Expected completion: 10-20 minutes`);
      } else if (cctpContract === v2Address) {
        console.log(`   ⚡ Configured for CCTP v2 (fast speed)`);
        console.log(`   ⏰ Expected completion: 8-20 seconds`);
        console.log(`   ⚠️  If taking longer, v2 may not be working as expected`);
      }
    }
  }
  
  console.log(`\n🔗 Monitoring Links:`);
  console.log(`   📍 BaseScan: https://basescan.org/tx/${txHash}`);
  console.log(`   📍 Arbitrum Address: https://arbiscan.io/address/0xFC825D166f219ea5Aa75d993609eae546E013cEE`);
  console.log(`   📍 CCTP API: ${cctpApiBase}/v1/messages/${baseDomainId}/${txHash}`);
  
  console.log(`\n💡 Next Steps:`);
  console.log(`   1. Check Arbitrum address for received USDC`);
  console.log(`   2. Monitor CCTP API for attestation`);
  console.log(`   3. If delayed >20 min, may need manual completion`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
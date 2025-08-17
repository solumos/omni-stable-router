const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 TRACKING CCTP TRANSFER STATUS");
  console.log("================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const txHash = "0xcbcf2f866890dffbe2e2ef19b3f5950066559783da5fb11557f2516240c89244";
  const userAddress = "0xFC825D166f219ea5Aa75d993609eae546E013cEE";
  
  console.log(`📋 Transaction: ${txHash}`);
  console.log(`👤 User: ${userAddress}\n`);
  
  // Get transaction receipt
  console.log("🔍 Getting Transaction Receipt...");
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    throw new Error("Transaction not found");
  }
  
  console.log(`✅ Block: ${receipt.blockNumber}`);
  console.log(`✅ Status: ${receipt.status ? "Success" : "Failed"}`);
  console.log(`✅ Gas Used: ${receipt.gasUsed}`);
  
  // Look for CCTP events
  console.log("\n🔍 Analyzing Transaction Logs...");
  
  // CCTP MessageSent event signature
  const messageSentTopic = ethers.id("MessageSent(bytes)");
  const depositForBurnTopic = ethers.id("DepositForBurn(uint64,address,uint256,address,bytes32,uint32,bytes32,bytes32)");
  
  let cctpMessage = null;
  let cctpNonce = null;
  
  for (const log of receipt.logs) {
    if (log.topics[0] === messageSentTopic) {
      console.log("✅ Found MessageSent event");
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["bytes"], log.data);
      cctpMessage = decoded[0];
      console.log(`   Message: ${cctpMessage.slice(0, 100)}...`);
    }
    
    if (log.topics[0] === depositForBurnTopic) {
      console.log("✅ Found DepositForBurn event");
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint64", "address", "uint256", "address", "bytes32", "uint32", "bytes32", "bytes32"],
        log.data
      );
      cctpNonce = decoded[0];
      console.log(`   Nonce: ${cctpNonce}`);
      console.log(`   Amount: ${ethers.formatUnits(decoded[2], 6)} USDC`);
      console.log(`   Destination Domain: ${decoded[5]}`);
    }
  }
  
  if (!cctpMessage || !cctpNonce) {
    console.log("❌ CCTP events not found in transaction");
    console.log("This might indicate an issue with the CCTP integration");
    return;
  }
  
  console.log(`\n📊 CCTP Transfer Details:`);
  console.log(`   Nonce: ${cctpNonce}`);
  console.log(`   Message Length: ${cctpMessage.length} bytes`);
  
  // Check current time vs transaction time
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  const txTime = new Date(block.timestamp * 1000);
  const now = new Date();
  const elapsed = Math.floor((now - txTime) / 1000);
  
  console.log(`\n⏰ Timing:`);
  console.log(`   Transaction Time: ${txTime.toISOString()}`);
  console.log(`   Current Time: ${now.toISOString()}`);
  console.log(`   Elapsed: ${elapsed} seconds`);
  
  if (elapsed < 30) {
    console.log(`   Status: 🟡 Still processing (${elapsed}s elapsed)`);
    console.log(`   Expected: CCTP v2 should complete in 8-20 seconds`);
  } else if (elapsed < 120) {
    console.log(`   Status: 🟠 Taking longer than expected (${elapsed}s elapsed)`);
    console.log(`   Note: CCTP v2 usually completes in 8-20 seconds`);
  } else {
    console.log(`   Status: 🔴 Significantly delayed (${elapsed}s elapsed)`);
    console.log(`   Issue: CCTP v2 should have completed by now`);
  }
  
  console.log(`\n🔗 Monitoring Links:`);
  console.log(`   Base TX: https://basescan.org/tx/${txHash}`);
  console.log(`   Arbitrum Address: https://arbiscan.io/address/${userAddress}`);
  console.log(`   CCTP Explorer: https://cctp.chain.link/`);
  
  // Check if we're actually using CCTP v2
  console.log(`\n🔍 Verifying CCTP v2 Configuration...`);
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const cctpContract = await router.protocolContracts(1);
  
  const v1Address = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  const v2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  
  console.log(`   Router CCTP: ${cctpContract}`);
  console.log(`   Using v1: ${cctpContract === v1Address}`);
  console.log(`   Using v2: ${cctpContract === v2Address}`);
  
  if (cctpContract === v1Address) {
    console.log(`   ⚠️  Router is still using CCTP v1 (slow transfers)`);
    console.log(`   Expected time: 10-20 minutes`);
  } else if (cctpContract === v2Address) {
    console.log(`   ✅ Router is using CCTP v2 (fast transfers)`);
    console.log(`   Expected time: 8-20 seconds`);
  }
  
  console.log(`\n💡 Next Steps:`);
  if (elapsed > 120 && cctpContract === v2Address) {
    console.log(`   1. CCTP v2 should be much faster - investigating delay`);
    console.log(`   2. Check if CCTP v2 attestation service is running`);
    console.log(`   3. May need to manually check attestation status`);
  } else if (cctpContract === v1Address) {
    console.log(`   1. Wait 10-20 minutes for CCTP v1 completion`);
    console.log(`   2. Router needs to be upgraded to CCTP v2`);
  } else {
    console.log(`   1. Continue monitoring transfer progress`);
    console.log(`   2. CCTP transfers can occasionally take longer`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
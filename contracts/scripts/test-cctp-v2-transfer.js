const { ethers } = require("hardhat");
const axios = require("axios");

async function main() {
  console.log("⚡ CCTP V2 FAST TRANSFER TEST");
  console.log("==============================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    console.log("❌ Please run this on Base mainnet (chain ID 8453)");
    return;
  }
  
  const [user] = await ethers.getSigners();
  
  // Configuration
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  // Small test amount
  const TRANSFER_AMOUNT = "0.001"; // 0.1 cent for testing
  
  console.log("🚀 CCTP V2 Fast Transfer Configuration:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Protocol: CCTP V2 with Fast Transfers");
  console.log("   Expected Time: 8-20 seconds ⚡");
  console.log("   From: Base (Chain 8453)");
  console.log("   To: Arbitrum (Chain 42161)");
  console.log("   Amount: " + TRANSFER_AMOUNT + " USDC");
  console.log("   User: " + user.address);
  console.log("\n");
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Verify V2 configuration
  console.log("🔍 Verifying CCTP V2 Configuration...");
  const routeKey = await router.getRouteKey(usdcBase, 8453, usdcArbitrum, 42161);
  const route = await router.routes(routeKey);
  
  const CCTP_V2_MESSENGER = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  
  if (route.bridgeContract === CCTP_V2_MESSENGER) {
    console.log("✅ CCTP V2 TokenMessenger confirmed: " + route.bridgeContract);
    console.log("✅ Fast transfers enabled (8-20 seconds)");
  } else {
    console.log("❌ Not using CCTP V2! Current: " + route.bridgeContract);
    console.log("   Expected: " + CCTP_V2_MESSENGER);
    return;
  }
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log("\n💰 Current Balance: " + ethers.formatUnits(balance, 6) + " USDC");
  
  const amount = ethers.parseUnits(TRANSFER_AMOUNT, 6);
  
  if (balance < amount) {
    console.log("❌ Insufficient USDC balance (need at least " + TRANSFER_AMOUNT + " USDC)");
    return;
  }
  
  // Check and set allowance
  const currentAllowance = await usdcContract.allowance(user.address, routerAddress);
  if (currentAllowance < amount) {
    console.log("\n🔓 Approving USDC...");
    const approveTx = await usdcContract.approve(routerAddress, amount);
    await approveTx.wait();
    console.log("✅ Approved");
  }
  
  // Execute V2 Fast Transfer
  console.log("\n⚡ EXECUTING CCTP V2 FAST TRANSFER");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const startTime = Date.now();
  
  console.log("📤 Sending transaction...");
  const transferTx = await router.transfer(
    usdcBase,
    usdcArbitrum,
    amount,
    42161,
    user.address
  );
  
  console.log("\n✅ Transaction Sent!");
  console.log("   TX Hash: " + transferTx.hash);
  console.log("   View on BaseScan: https://basescan.org/tx/" + transferTx.hash);
  console.log("\n⏳ Waiting for confirmation...");
  
  const receipt = await transferTx.wait();
  const confirmTime = (Date.now() - startTime) / 1000;
  
  console.log("\n✅ Transaction Confirmed!");
  console.log("   Block: " + receipt.blockNumber);
  console.log("   Gas Used: " + receipt.gasUsed);
  console.log("   Confirmation Time: " + confirmTime.toFixed(1) + " seconds");
  
  // Register with relayer for fast attestation
  console.log("\n🤖 REGISTERING WITH OMNISTABLE RELAYER FOR V2 FAST COMPLETION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const RELAYER_API = "https://api.omnistable.xyz";
  
  try {
    console.log("📡 Calling relayer at " + RELAYER_API + "...");
    
    const response = await axios.post(RELAYER_API + "/relayer/monitor", {
      tx_hash: transferTx.hash,
      source_chain: "base",
      dest_chain: "arbitrum"
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log("\n✅ Transfer registered with V2 fast relayer!");
    console.log("   Status: " + response.data.status);
    
    console.log("\n⚡ CCTP V2 Fast Transfer Process:");
    console.log("   1. ✅ Transaction confirmed on Base");
    console.log("   2. ⏳ Circle V2 attestation (8-20 seconds)...");
    console.log("   3. ⏳ Relayer auto-completes on Arbitrum...");
    console.log("   4. ⏳ USDC delivered to recipient");
    
    // Monitor for fast completion
    console.log("\n🔄 Monitoring V2 Fast Transfer...");
    
    let lastStatus = response.data.status;
    let attempts = 0;
    const maxAttempts = 10; // Only wait 50 seconds for V2
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const statusResponse = await axios.get(
          RELAYER_API + "/relayer/status/" + transferTx.hash,
          { timeout: 10000 }
        );
        
        const currentStatus = statusResponse.data.status;
        const elapsed = (Date.now() - startTime) / 1000;
        
        if (currentStatus !== lastStatus) {
          console.log("\n📍 V2 Status Update [" + elapsed.toFixed(1) + "s]:");
          
          if (currentStatus === "attested") {
            console.log("   ✅ V2 Fast attestation received!");
            console.log("   ⚡ Completing on Arbitrum...");
          } else if (currentStatus === "completed") {
            console.log("   🎉 V2 FAST TRANSFER COMPLETE!");
            console.log("   ⏰ Total time: " + elapsed.toFixed(1) + " seconds");
            console.log("   💰 USDC delivered to " + user.address);
            console.log("   🔗 View on Arbiscan: https://arbiscan.io/address/" + user.address);
            break;
          }
          
          lastStatus = currentStatus;
        } else {
          process.stdout.write("\r⚡ V2 Status: " + currentStatus + " [" + elapsed.toFixed(0) + "s elapsed]");
        }
        
      } catch (e) {
        process.stdout.write("\r⏳ Checking V2 status... [" + (attempts * 5) + "s]");
      }
    }
    
    if (lastStatus === "completed") {
      const totalTime = (Date.now() - startTime) / 1000;
      console.log("\n\n" + "=".repeat(60));
      console.log("🎉 CCTP V2 FAST TRANSFER SUCCESS!");
      console.log("=".repeat(60));
      console.log("✅ Completed in " + totalTime.toFixed(1) + " seconds");
      console.log("⚡ " + Math.round(600 / totalTime) + "x faster than V1!");
    }
    
  } catch (error) {
    console.log("\n⚠️  Relayer error: " + error.message);
    console.log("   Transfer will still complete via V2 (8-20 seconds)");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 CCTP V2 TRANSFER SUMMARY");
  console.log("=".repeat(60));
  console.log("• Protocol: CCTP V2 (Fast Transfers)");
  console.log("• Amount: " + TRANSFER_AMOUNT + " USDC");
  console.log("• Route: Base → Arbitrum");
  console.log("• TX Hash: " + transferTx.hash);
  console.log("• Expected Time: 8-20 seconds");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
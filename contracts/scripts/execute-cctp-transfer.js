const { ethers } = require("hardhat");
const axios = require("axios");

async function main() {
  console.log("⚡ CCTP V2 TRANSFER: USDC BASE → ARBITRUM");
  console.log("=========================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Please run this on Base mainnet (chain ID 8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Configuration
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb"; // UnifiedRouter on Base
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  // Transfer amount - change this as needed
  const TRANSFER_AMOUNT = "0.01"; // 1 cent USDC
  
  console.log("📊 Transfer Configuration:");
  console.log(`   From: Base (Chain 8453)`);
  console.log(`   To: Arbitrum (Chain 42161)`);
  console.log(`   Amount: ${TRANSFER_AMOUNT} USDC`);
  console.log(`   User: ${user.address}`);
  console.log(`   Router: ${routerAddress}`);
  console.log(`   Relayer: https://api.omnistable.xyz\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 Current Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  const amount = ethers.parseUnits(TRANSFER_AMOUNT, 6);
  
  if (balance < amount) {
    console.log(`❌ Insufficient USDC balance (need at least ${TRANSFER_AMOUNT} USDC)`);
    return;
  }
  
  // Check if route is configured
  console.log("🔍 Checking route configuration...");
  const isConfigured = await router.isRouteConfigured(
    usdcBase,
    8453,
    usdcArbitrum,
    42161
  );
  
  if (!isConfigured) {
    console.log("⚙️  Configuring CCTP route...");
    
    const route = {
      protocol: 1, // Protocol.CCTP
      protocolDomain: 3, // Arbitrum domain for CCTP
      bridgeContract: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962", // TokenMessenger on Base
      poolId: 0,
      swapPool: ethers.ZeroAddress,
      extraData: "0x"
    };
    
    const configTx = await router.configureRoute(
      usdcBase,
      8453,
      usdcArbitrum,
      42161,
      route
    );
    await configTx.wait();
    console.log("✅ Route configured\n");
  } else {
    console.log("✅ Route already configured\n");
  }
  
  // Check and set allowance
  const currentAllowance = await usdcContract.allowance(user.address, routerAddress);
  if (currentAllowance < amount) {
    console.log("🔓 Approving USDC...");
    const approveTx = await usdcContract.approve(routerAddress, amount);
    await approveTx.wait();
    console.log("✅ Approved\n");
  } else {
    console.log("✅ Sufficient allowance\n");
  }
  
  // Execute transfer
  console.log("🚀 EXECUTING TRANSFER");
  console.log("====================");
  
  const startTime = Date.now();
  
  console.log("📤 Sending transaction...");
  const transferTx = await router.transfer(
    usdcBase,
    usdcArbitrum,
    amount,
    42161,
    user.address
  );
  
  console.log(`\n✅ Transaction Sent!`);
  console.log(`   TX Hash: ${transferTx.hash}`);
  console.log(`   View on BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`\n⏳ Waiting for confirmation...`);
  
  const receipt = await transferTx.wait();
  const confirmTime = (Date.now() - startTime) / 1000;
  
  console.log(`\n✅ Transaction Confirmed!`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed}`);
  console.log(`   Confirmation Time: ${confirmTime.toFixed(1)} seconds\n`);
  
  // Register with Omnistable relayer
  console.log("🤖 REGISTERING WITH OMNISTABLE RELAYER");
  console.log("======================================");
  
  const RELAYER_API = "https://api.omnistable.xyz";
  
  let lastStatus = "submitted"; // Initialize lastStatus
  
  try {
    console.log(`📡 Calling relayer at ${RELAYER_API}...`);
    
    const response = await axios.post(`${RELAYER_API}/relayer/monitor`, {
      tx_hash: transferTx.hash,
      source_chain: "base",
      dest_chain: "arbitrum"
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log("\n✅ Transfer registered with Omnistable relayer!");
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Transaction: ${response.data.tx_hash}`);
    
    console.log("\n📊 Automated Process:");
    console.log("   1. ✅ Transaction confirmed on Base");
    console.log("   2. ⏳ Relayer monitoring Circle API...");
    console.log("   3. ⏳ Waiting for attestation (8-20 seconds)...");
    console.log("   4. ⏳ Auto-completion on Arbitrum...");
    console.log("   5. ⏳ USDC delivered to recipient");
    
    // Monitor status
    console.log("\n🔄 Monitoring Transfer Status...");
    console.log("   (Press Ctrl+C to stop monitoring)\n");
    
    let lastStatus = response.data.status;
    let attempts = 0;
    const maxAttempts = 30; // Monitor for up to 150 seconds
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const statusResponse = await axios.get(
          `${RELAYER_API}/relayer/status/${transferTx.hash}`,
          { timeout: 10000 }
        );
        
        const currentStatus = statusResponse.data.status;
        const elapsed = (Date.now() - startTime) / 1000;
        
        if (currentStatus !== lastStatus) {
          console.log(`\n📍 Status Update [${elapsed.toFixed(1)}s]:`);
          
          if (currentStatus === "attested") {
            console.log("   ✅ Attestation received from Circle!");
            console.log("   ⚡ Relayer completing transfer on Arbitrum...");
          } else if (currentStatus === "completing") {
            console.log("   🔄 Minting USDC on Arbitrum...");
          } else if (currentStatus === "completed") {
            console.log("   🎉 TRANSFER COMPLETE!");
            console.log(`   ⏰ Total time: ${elapsed.toFixed(1)} seconds`);
            console.log(`   💰 USDC delivered to ${user.address}`);
            console.log(`   🔗 View on Arbiscan: https://arbiscan.io/address/${user.address}`);
            break;
          } else if (currentStatus === "failed") {
            console.log("   ❌ Transfer failed - check logs for details");
            break;
          }
          
          lastStatus = currentStatus;
        } else {
          process.stdout.write(`\r⏳ Status: ${currentStatus} [${elapsed.toFixed(0)}s elapsed]`);
        }
        
      } catch (e) {
        process.stdout.write(`\r⏳ Checking status... [${attempts * 5}s]`);
      }
    }
    
    if (lastStatus !== "completed" && lastStatus !== "failed") {
      console.log("\n\n⚠️  Transfer still processing");
      console.log("   Check status at: https://developers.circle.com/cctp/message-search");
      console.log(`   Or continue monitoring: GET ${RELAYER_API}/relayer/status/${transferTx.hash}`);
    }
    
  } catch (error) {
    console.log("\n⚠️  Could not connect to Omnistable relayer");
    console.log(`   Error: ${error.message}`);
    console.log("\n📝 Manual Completion Required:");
    console.log("   1. Wait 8-20 seconds for Circle attestation");
    console.log("   2. Check status at: https://developers.circle.com/cctp/message-search");
    console.log("   3. Your USDC will arrive on Arbitrum once attested");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("📋 TRANSFER SUMMARY");
  console.log("=".repeat(60));
  console.log(`• Amount: ${TRANSFER_AMOUNT} USDC`);
  console.log(`• Route: Base → Arbitrum`);
  console.log(`• Protocol: CCTP (${lastStatus === "completed" ? "V2 Fast" : "Standard"})`);
  console.log(`• TX Hash: ${transferTx.hash}`);
  console.log(`• Status: ${lastStatus || "Submitted"}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
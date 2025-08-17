const { ethers } = require("hardhat");
const axios = require("axios");

async function main() {
  console.log("⚡ CCTP V2 TEST WITH AUTOMATED RELAYER");
  console.log("======================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Use the main UnifiedRouter deployed on Base
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`💰 Test Amount: 0.01 USDC (1 cent)\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 Current Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < ethers.parseUnits("0.01", 6)) {
    console.log("❌ Insufficient USDC balance (need at least 0.01)");
    return;
  }
  
  // Test with 1 cent
  const amount = ethers.parseUnits("0.01", 6);
  
  // Check route configuration
  console.log("🔍 Checking CCTP v2 route...");
  const isConfigured = await router.isRouteConfigured(
    usdcBase,
    8453,
    usdcArbitrum,
    42161
  );
  
  if (!isConfigured) {
    console.log("⚙️  Configuring CCTP v2 route...");
    
    const route = {
      protocol: 1, // Protocol.CCTP
      protocolDomain: 3, // Arbitrum domain for CCTP
      bridgeContract: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
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
  
  // Approve
  const currentAllowance = await usdcContract.allowance(user.address, routerAddress);
  if (currentAllowance < amount) {
    console.log("🔓 Approving USDC...");
    const approveTx = await usdcContract.approve(routerAddress, amount);
    await approveTx.wait();
    console.log("✅ Approved\n");
  }
  
  // Execute CCTP v2 transfer
  console.log("🚀 EXECUTING CCTP V2 FAST TRANSFER");
  console.log("==================================");
  console.log("📊 Transfer Details:");
  console.log(`   From: Base (Chain 8453)`);
  console.log(`   To: Arbitrum (Chain 42161)`);
  console.log(`   Amount: 0.01 USDC`);
  console.log(`   Protocol: CCTP v2`);
  console.log(`   Expected time: 8-20 seconds\n`);
  
  const startTime = Date.now();
  
  console.log("📤 Sending transaction...");
  const transferTx = await router.transfer(
    usdcBase,
    usdcArbitrum,
    amount,
    42161,
    user.address
  );
  
  console.log(`✅ TX Sent: ${transferTx.hash}`);
  console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log("⏳ Waiting for confirmation...\n");
  
  const receipt = await transferTx.wait();
  const confirmTime = Date.now();
  
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
  console.log(`⏰ Confirmation time: ${(confirmTime - startTime) / 1000} seconds\n`);
  
  // Register with relayer
  console.log("🤖 REGISTERING WITH AUTOMATED RELAYER");
  console.log("=====================================");
  
  const RELAYER_API = process.env.RELAYER_API_URL || "http://localhost:8000";
  
  try {
    console.log(`📡 Calling relayer API at ${RELAYER_API}...`);
    
    const response = await axios.post(`${RELAYER_API}/api/v1/relayer/monitor`, {
      tx_hash: transferTx.hash,
      source_chain: "base",
      dest_chain: "arbitrum"
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log("✅ Transfer registered with relayer!");
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Monitor ID: ${response.data.tx_hash}`);
    console.log("\n📊 Automated Process:");
    console.log("1. ✅ Transaction confirmed on Base");
    console.log("2. ⏳ Relayer monitoring Circle API...");
    console.log("3. ⏳ Waiting for attestation (5-10s)...");
    console.log("4. ⏳ Auto-completion on Arbitrum...");
    console.log("5. ⏳ USDC delivered to recipient");
    
    // Poll for status updates
    console.log("\n🔄 Monitoring transfer status...");
    let lastStatus = response.data.status;
    let attempts = 0;
    const maxAttempts = 20; // Check for up to 100 seconds
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      try {
        const statusResponse = await axios.get(
          `${RELAYER_API}/api/v1/relayer/status/${transferTx.hash}`,
          { timeout: 5000 }
        );
        
        const currentStatus = statusResponse.data.status;
        const elapsed = (Date.now() - startTime) / 1000;
        
        if (currentStatus !== lastStatus) {
          console.log(`\n📍 Status Update [${elapsed.toFixed(1)}s]:`);
          
          if (currentStatus === "attested") {
            console.log("   ✅ Attestation received from Circle!");
            console.log("   ⚡ Relayer completing transfer...");
          } else if (currentStatus === "completing") {
            console.log("   🔄 Minting USDC on Arbitrum...");
          } else if (currentStatus === "completed") {
            const totalTime = (Date.now() - startTime) / 1000;
            console.log("   🎉 TRANSFER COMPLETE!");
            console.log(`   ⏰ Total time: ${totalTime.toFixed(1)} seconds`);
            console.log(`   💰 USDC delivered to ${user.address}`);
            console.log(`   🔗 Check Arbitrum: https://arbiscan.io/address/${user.address}`);
            break;
          } else if (currentStatus === "failed") {
            console.log("   ❌ Transfer failed");
            break;
          }
          
          lastStatus = currentStatus;
        } else {
          process.stdout.write(`\r⏳ Waiting... [${elapsed.toFixed(0)}s] Status: ${currentStatus}`);
        }
        
      } catch (e) {
        // Continue polling even if status check fails
        process.stdout.write(`\r⏳ Checking... [${attempts * 5}s]`);
      }
    }
    
    if (lastStatus !== "completed" && lastStatus !== "failed") {
      console.log("\n\n⚠️  Transfer still processing after 100 seconds");
      console.log("   This is unusual for CCTP v2");
      console.log("   Check manually on Circle: https://developers.circle.com/cctp/message-search");
    }
    
  } catch (error) {
    console.log("⚠️  Relayer API not available");
    console.log(`   Error: ${error.message}`);
    console.log("\n📝 Manual completion required:");
    console.log("1. Wait for Circle attestation (5-10s)");
    console.log("2. Check status: https://developers.circle.com/cctp/message-search");
    console.log("3. Call receiveMessage() on Arbitrum MessageTransmitter");
    console.log("\n💡 To enable automation:");
    console.log("1. Start the relayer API: cd api && python start_api_with_relayer.py");
    console.log("2. Set RELAYER_API_URL environment variable");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🏁 CCTP V2 TEST COMPLETE");
  console.log("=".repeat(60));
  
  console.log("\n📊 Summary:");
  console.log(`• Protocol: CCTP v2 (Fast Transfers)`);
  console.log(`• Route: Base → Arbitrum`);
  console.log(`• Amount: 0.01 USDC`);
  console.log(`• TX Hash: ${transferTx.hash}`);
  console.log(`• Relayer: ${typeof lastStatus !== 'undefined' && lastStatus === "completed" ? "✅ Automated" : "⚠️ Manual required"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
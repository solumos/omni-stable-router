const { ethers } = require("hardhat");
const axios = require("axios");

async function main() {
  console.log("🚀 CCTP V2 AUTOMATED ATTESTATION TEST");
  console.log("======================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // CCTP v2 Router deployed with fast transfers support
  const routerAddress = "0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress} (CCTP v2 with fast transfers)`);
  console.log(`💰 Test Amount: 0.01 USDC (1 cent)\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Test with 1 cent
  const amount = ethers.parseUnits("0.01", 6);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 Current Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    console.log("❌ Insufficient USDC balance");
    return;
  }
  
  // Check route configuration
  console.log("🔍 Checking CCTP v2 Route Configuration...");
  const isConfigured = await router.isRouteConfigured(
    usdcBase,
    8453,
    usdcArbitrum,
    42161
  );
  
  if (!isConfigured) {
    console.log("⚠️  Route not configured. Configuring CCTP v2 route...");
    
    const route = {
      protocol: 1, // Protocol.CCTP
      protocolDomain: 3, // Arbitrum domain ID for CCTP
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
    console.log("✅ CCTP v2 route configured\n");
  } else {
    console.log("✅ CCTP v2 route already configured\n");
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
  console.log("⚡ EXECUTING CCTP V2 FAST TRANSFER");
  console.log("==================================");
  console.log("📊 Transfer Details:");
  console.log(`   From: Base (Chain ID: 8453)`);
  console.log(`   To: Arbitrum (Chain ID: 42161)`);
  console.log(`   Amount: 0.01 USDC`);
  console.log(`   Protocol: CCTP v2 with depositForBurn()`);
  console.log(`   Finality Threshold: 1000 (for fast transfers)`);
  console.log("");
  
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
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await transferTx.wait();
  const confirmTime = Date.now();
  
  console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
  console.log(`⏰ Confirmation time: ${(confirmTime - startTime) / 1000} seconds\n`);
  
  // Start monitoring for attestation
  console.log("🔍 MONITORING ATTESTATION STATUS");
  console.log("=================================");
  
  // Register with relayer API
  if (process.env.RELAYER_ENABLED === "true") {
    console.log("📡 Registering with automated relayer...");
    try {
      const response = await axios.post("http://localhost:8000/api/v1/relayer/monitor", {
        tx_hash: transferTx.hash,
        source_chain: "base",
        dest_chain: "arbitrum"
      });
      console.log("✅ Registered with relayer");
      console.log(`   Monitor ID: ${response.data.tx_hash}`);
    } catch (e) {
      console.log("⚠️  Relayer API not available - manual monitoring");
    }
  }
  
  // Monitor attestation status
  console.log("\n📊 Attestation Progress:");
  console.log("   Step 1: Transaction confirmed on Base ✅");
  console.log("   Step 2: Waiting for Circle attestation...");
  
  let attestationFound = false;
  let attempts = 0;
  const maxAttempts = 20; // Check for up to 100 seconds
  
  while (!attestationFound && attempts < maxAttempts) {
    attempts++;
    
    try {
      // Check Circle API v2 endpoint
      const apiUrl = `https://iris-api.circle.com/v2/messages/6?transactionHash=${transferTx.hash}`;
      const response = await axios.get(apiUrl, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.data.messages && response.data.messages.length > 0) {
        const message = response.data.messages[0];
        const status = message.status;
        
        if (status === "complete" && message.attestation) {
          attestationFound = true;
          const attestTime = Date.now();
          
          console.log(`   Step 2: Attestation received ✅`);
          console.log(`   Step 3: Ready for minting on Arbitrum ✅`);
          console.log(`\n⏰ Time to attestation: ${(attestTime - confirmTime) / 1000} seconds`);
          console.log(`⏰ Total time: ${(attestTime - startTime) / 1000} seconds`);
          
          console.log("\n📋 Attestation Details:");
          console.log(`   Event Nonce: ${message.eventNonce}`);
          console.log(`   Status: ${status}`);
          console.log(`   Attestation: ${message.attestation.substring(0, 20)}...`);
          
          if (process.env.RELAYER_ENABLED === "true") {
            console.log("\n🤖 Automated Relayer Status:");
            console.log("   The relayer will automatically complete the transfer");
            console.log("   Expected completion: 2-5 seconds");
            console.log(`   Check Arbitrum: https://arbiscan.io/address/${user.address}`);
          } else {
            console.log("\n📝 Next Steps (Manual):");
            console.log("   1. Call receiveMessage() on Arbitrum MessageTransmitter");
            console.log("   2. Pass the message and attestation as parameters");
            console.log("   3. USDC will be minted to recipient");
          }
          
          break;
        } else {
          process.stdout.write(`\r   Step 2: Waiting for attestation... (${status || 'pending'}) [${attempts * 5}s]`);
        }
      } else {
        process.stdout.write(`\r   Step 2: Waiting for attestation... (pending) [${attempts * 5}s]`);
      }
      
    } catch (e) {
      // API might return 404 initially
      process.stdout.write(`\r   Step 2: Waiting for attestation... (indexing) [${attempts * 5}s]`);
    }
    
    // Wait 5 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  if (!attestationFound) {
    console.log("\n⚠️  Attestation not found after 100 seconds");
    console.log("   This is unusual for CCTP v2 fast transfers");
    console.log("   Check manually: https://developers.circle.com/cctp/message-search");
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 CCTP V2 FAST TRANSFER TEST COMPLETE!");
  console.log("=".repeat(60));
  
  console.log("\n📊 Summary:");
  console.log("• Protocol: CCTP v2 with fast transfers");
  console.log("• Expected time: 8-20 seconds total");
  console.log("• Attestation: Automated via Circle API");
  console.log("• Completion: Automated via relayer service");
  console.log("• Gas optimized: Using finality threshold");
  
  console.log("\n🔍 Verify Transfer:");
  console.log(`• Base TX: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`• Arbitrum: https://arbiscan.io/address/${user.address}`);
  console.log(`• Circle Status: https://developers.circle.com/cctp/message-search`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
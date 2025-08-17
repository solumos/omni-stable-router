const { ethers } = require("hardhat");

async function main() {
  console.log("💰 TESTING CCTP TRANSFER: BASE → ARBITRUM");
  console.log("=========================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [signer] = await ethers.getSigners();
  
  // Contract addresses
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const usdcBaseAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrumAddress = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${signer.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`💰 USDC Base: ${usdcBaseAddress}`);
  console.log(`🎯 USDC Arbitrum: ${usdcArbitrumAddress}\n`);
  
  // Get contracts
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdc = await ethers.getContractAt([
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ], usdcBaseAddress);
  
  // Check USDC details
  const decimals = await usdc.decimals();
  const symbol = await usdc.symbol();
  const balance = await usdc.balanceOf(signer.address);
  
  console.log(`💰 Token: ${symbol} (${decimals} decimals)`);
  console.log(`📊 Your Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  
  // Transfer amount: $0.50 worth of USDC
  const transferAmount = ethers.parseUnits("0.5", decimals); // 0.5 USDC
  console.log(`📤 Transfer Amount: ${ethers.formatUnits(transferAmount, decimals)} ${symbol} (~$0.50)\n`);
  
  if (balance < transferAmount) {
    console.log("❌ Insufficient USDC balance!");
    console.log(`   Need: ${ethers.formatUnits(transferAmount, decimals)} ${symbol}`);
    console.log(`   Have: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    return;
  }
  
  // Check route configuration
  console.log("🔍 Checking CCTP Route...");
  try {
    const routeConfigured = await router.isRouteConfigured(
      usdcBaseAddress,
      8453, // Base
      usdcArbitrumAddress,
      42161 // Arbitrum
    );
    
    console.log(`   CCTP Route Configured: ${routeConfigured}`);
    
    if (!routeConfigured) {
      console.log("❌ CCTP route not configured!");
      return;
    }
  } catch (e) {
    console.log("❌ Route check failed:", e.message);
    return;
  }
  
  // Check allowance
  console.log("\n🔍 Checking Token Allowance...");
  const allowance = await usdc.allowance(signer.address, routerAddress);
  console.log(`   Current Allowance: ${ethers.formatUnits(allowance, decimals)} ${symbol}`);
  
  if (allowance < transferAmount) {
    console.log("🔓 Approving USDC...");
    try {
      const approveTx = await usdc.approve(routerAddress, transferAmount);
      console.log(`   Approval TX: ${approveTx.hash}`);
      await approveTx.wait();
      console.log("✅ USDC approved");
    } catch (e) {
      console.log("❌ Approval failed:", e.message);
      return;
    }
  } else {
    console.log("✅ Sufficient allowance");
  }
  
  // Execute CCTP transfer
  console.log("\n🚀 Executing CCTP Transfer...");
  console.log("📡 Transfer Details:");
  console.log(`   From: ${ethers.formatUnits(transferAmount, decimals)} USDC on Base`);
  console.log(`   To: ${ethers.formatUnits(transferAmount, decimals)} USDC on Arbitrum`);
  console.log(`   Recipient: ${signer.address}`);
  console.log(`   Protocol: CCTP (Circle Cross-Chain Transfer Protocol)`);
  
  const balanceBefore = await usdc.balanceOf(signer.address);
  
  try {
    const transferTx = await router.transfer(
      usdcBaseAddress,       // fromToken
      usdcArbitrumAddress,   // toToken  
      transferAmount,        // amount
      42161,                 // toChainId (Arbitrum)
      signer.address,        // recipient
      {
        gasLimit: 300000     // Higher gas limit for CCTP
      }
    );
    
    console.log(`\n📋 Transaction Submitted!`);
    console.log(`   TX Hash: ${transferTx.hash}`);
    console.log(`   🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await transferTx.wait();
    
    console.log(`✅ Transaction Confirmed!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    
    // Check balance change
    const balanceAfter = await usdc.balanceOf(signer.address);
    const amountSpent = balanceBefore - balanceAfter;
    
    console.log(`\n💸 Balance Changes:`);
    console.log(`   Before: ${ethers.formatUnits(balanceBefore, decimals)} ${symbol}`);
    console.log(`   After: ${ethers.formatUnits(balanceAfter, decimals)} ${symbol}`);
    console.log(`   Spent: ${ethers.formatUnits(amountSpent, decimals)} ${symbol}`);
    
    if (amountSpent === transferAmount) {
      console.log("✅ Correct amount deducted from Base!");
    } else {
      console.log(`⚠️  Amount mismatch - expected ${ethers.formatUnits(transferAmount, decimals)}`);
    }
    
    // Parse events for CCTP details
    console.log(`\n📋 Transaction Events:`);
    for (const log of receipt.logs) {
      try {
        const parsed = router.interface.parseLog(log);
        if (parsed) {
          console.log(`   🔍 ${parsed.name}`);
        }
      } catch (e) {
        // Try USDC contract events
        try {
          const usdcParsed = usdc.interface.parseLog(log);
          if (usdcParsed) {
            console.log(`   💰 ${usdcParsed.name}`);
          }
        } catch (e2) {
          // Ignore unparseable logs
        }
      }
    }
    
    // CCTP monitoring instructions
    console.log("\n🛰️  CCTP MONITORING");
    console.log("===================");
    console.log("🔵 CCTP Process:");
    console.log("   1. ✅ USDC burned on Base");
    console.log("   2. 🌐 CCTP message sent");
    console.log("   3. ⏳ Message propagating to Arbitrum...");
    console.log("   4. ⏳ Waiting for CCTP attestation...");
    console.log("   5. ⏳ USDC will be minted on Arbitrum...");
    
    console.log("\n📊 Monitoring Links:");
    console.log(`🔍 Base TX: https://basescan.org/tx/${transferTx.hash}`);
    console.log(`🔍 CCTP Explorer: https://cctp.chain.link/`);
    console.log(`🔍 Check Arbitrum: https://arbiscan.io/address/${signer.address}`);
    console.log(`⏱️  Estimated time: 10-20 minutes for CCTP completion`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 CCTP TRANSFER INITIATED!");
    console.log("=".repeat(50));
    console.log("✅ Base transaction confirmed");
    console.log("✅ USDC burned on Base");
    console.log("🔄 CCTP processing...");
    console.log("⏳ Waiting for Arbitrum mint");
    
    console.log(`\n💡 Expected Result:`);
    console.log(`   ${ethers.formatUnits(transferAmount, decimals)} USDC will appear in`);
    console.log(`   ${signer.address} on Arbitrum One`);
    
  } catch (e) {
    console.log("❌ Transfer failed:", e.message);
    
    console.log("\n🔍 Troubleshooting:");
    if (e.message.includes("insufficient funds")) {
      console.log("   • Check ETH balance for gas");
    }
    if (e.message.includes("allowance")) {
      console.log("   • Check USDC approval");
    }
    if (e.message.includes("route")) {
      console.log("   • Check route configuration");
    }
    return;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
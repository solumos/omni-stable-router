const { ethers } = require("hardhat");

async function main() {
  console.log("💰 SMALL CCTP V2 TEST - 1 CENT");
  console.log("==============================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Use the CCTP v2 router
  const routerAddress = "0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`💰 Amount: 0.01 USDC (1 cent)\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // 1 cent = 0.01 USDC
  const amount = ethers.parseUnits("0.01", 6);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 Current Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    throw new Error("Insufficient USDC balance");
  }
  
  // Check current allowance
  const currentAllowance = await usdcContract.allowance(user.address, routerAddress);
  console.log(`🔓 Current Allowance: ${ethers.formatUnits(currentAllowance, 6)} USDC`);
  
  if (currentAllowance < amount) {
    console.log("🔓 Approving 0.01 USDC...");
    const approveTx = await usdcContract.approve(routerAddress, amount);
    await approveTx.wait();
    console.log("✅ USDC approved");
  } else {
    console.log("✅ Already approved");
  }
  
  // Execute CCTP v2 transfer
  console.log("\n⚡ Executing CCTP v2 Fast Transfer...");
  console.log("   Protocol: CCTP v2 with fast finality");
  console.log("   Expected: 8-20 seconds completion");
  
  const startTime = new Date();
  console.log(`⏰ Start: ${startTime.toISOString()}`);
  
  try {
    const transferTx = await router.transfer(
      usdcBase,      // fromToken
      usdcArbitrum,  // toToken  
      amount,        // amount (0.01 USDC)
      42161,         // toChainId (Arbitrum)
      user.address   // recipient
    );
    
    console.log(`📋 TX Hash: ${transferTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await transferTx.wait();
    const endTime = new Date();
    
    console.log(`✅ Confirmed! Block: ${receipt.blockNumber}`);
    console.log(`⏰ Confirmed: ${endTime.toISOString()}`);
    console.log(`📊 Gas Used: ${receipt.gasUsed}`);
    
    // Check new balance
    const newBalance = await usdcContract.balanceOf(user.address);
    const spent = balance - newBalance;
    console.log(`💸 Amount Spent: ${ethers.formatUnits(spent, 6)} USDC`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 CCTP V2 TRANSFER INITIATED!");
    console.log("=".repeat(50));
    
    console.log("\n📍 Transaction Links:");
    console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
    console.log(`📡 Circle API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
    console.log(`🎯 Arbitrum: https://arbiscan.io/address/${user.address}`);
    
    console.log("\n⚡ CCTP v2 Process:");
    console.log("1. ✅ USDC burned on Base");
    console.log("2. 🔄 Attestation being generated (8-20 seconds)");
    console.log("3. ⏳ Need to complete transfer on Arbitrum");
    
    console.log("\n🔍 Attestation Status:");
    console.log("For CCTP v2 fast transfers, we need to:");
    console.log("1. Wait for attestation (8-20 seconds)");
    console.log("2. Fetch attestation from Circle API");
    console.log("3. Call receiveMessage() on destination chain");
    console.log("4. USDC gets minted to recipient");
    
    console.log("\n💡 Note: The attestation completion is NOT automatic!");
    console.log("Someone needs to fetch the attestation and complete the transfer on Arbitrum.");
    console.log("This can be done manually or via an automated relayer.");
    
  } catch (error) {
    console.log(`❌ Transfer failed: ${error.message}`);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
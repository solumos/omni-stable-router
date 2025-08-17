const { ethers } = require("hardhat");

async function main() {
  console.log("💰 EXECUTE 1 CENT CCTP V2 TRANSFER");
  console.log("=================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  const routerAddress = "0x3419bF0A8E74B825D14641B0Bf3D1Ce710E0aDC7";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}`);
  console.log(`💰 Amount: 0.01 USDC (1 cent)\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  const amount = ethers.parseUnits("0.01", 6);
  
  // Check balance and allowance
  const balance = await usdcContract.balanceOf(user.address);
  const allowance = await usdcContract.allowance(user.address, routerAddress);
  
  console.log(`💰 Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  console.log(`🔓 Allowance: ${ethers.formatUnits(allowance, 6)} USDC`);
  
  if (allowance < amount) {
    console.log("\n🔓 Setting approval with higher gas price...");
    const approveTx = await usdcContract.approve(routerAddress, amount, {
      gasPrice: ethers.parseUnits("5", "gwei") // Higher gas price
    });
    console.log("⏳ Waiting for approval...");
    await approveTx.wait();
    console.log("✅ Approved!");
  }
  
  // Execute transfer
  console.log("\n⚡ Executing CCTP v2 Fast Transfer...");
  console.log("   Using 7-parameter depositForBurn");
  console.log("   Finality threshold: 1000 (Fast)");
  console.log("   Expected: 8-20 seconds\n");
  
  const startTime = new Date();
  
  const transferTx = await router.transfer(
    usdcBase,     // fromToken
    usdcArbitrum, // toToken
    amount,       // amount
    42161,        // toChainId
    user.address, // recipient
    { gasPrice: ethers.parseUnits("5", "gwei") }
  );
  
  console.log(`📋 TX Hash: ${transferTx.hash}`);
  console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await transferTx.wait();
  const endTime = new Date();
  const elapsed = (endTime - startTime) / 1000;
  
  console.log(`✅ Confirmed! Block: ${receipt.blockNumber}`);
  console.log(`⏰ Confirmation time: ${elapsed} seconds`);
  console.log(`📊 Gas used: ${receipt.gasUsed}`);
  
  // Check new balance
  const newBalance = await usdcContract.balanceOf(user.address);
  const spent = balance - newBalance;
  console.log(`💸 USDC spent: ${ethers.formatUnits(spent, 6)}`);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 CCTP V2 TRANSFER INITIATED!");
  console.log("=".repeat(60));
  
  console.log("\n📍 Monitor Transfer:");
  console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
  console.log(`📡 Circle API: https://iris-api.circle.com/v1/messages/6/${transferTx.hash}`);
  console.log(`🎯 Arbitrum: https://arbiscan.io/address/${user.address}`);
  
  console.log("\n⚡ CCTP v2 Process:");
  console.log("1. ✅ USDC burned on Base (complete)");
  console.log("2. ⏳ Attestation generation (8-20 seconds)");
  console.log("3. ⏳ Need attestation relay to Arbitrum");
  console.log("4. ⏳ USDC minted on Arbitrum");
  
  console.log("\n⚠️  ATTESTATION NOT AUTOMATIC!");
  console.log("To complete the transfer:");
  console.log("1. Wait for attestation (check Circle API)");
  console.log("2. Fetch attestation from API");
  console.log("3. Call receiveMessage() on Arbitrum MessageTransmitter");
  console.log("4. USDC gets minted to recipient");
  
  console.log("\n💡 To implement attestation relay:");
  console.log("- Monitor Circle API for attestation");
  console.log("- Once available, submit to Arbitrum");
  console.log("- Can be automated with a relayer service");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
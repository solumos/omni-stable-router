const { ethers } = require("hardhat");

async function main() {
  console.log("⚡ SIMPLE CCTP V2 TEST");
  console.log("======================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Test the CCTP v2 contract directly
  const cctpV2Address = "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`⚡ CCTP v2: ${cctpV2Address}`);
  console.log(`💰 USDC: ${usdcBase}\n`);
  
  // Test CCTP v2 interface directly
  console.log("🧪 Testing CCTP v2 Interface...");
  
  const cctpV2ABI = [
    "function localDomain() view returns (uint32)",
    "function depositForBurn(uint256,uint32,bytes32,address) external returns (uint64)",
    "function depositForBurnWithHook(uint256,uint32,bytes32,address,bytes32,uint256,uint32) external returns (uint64)"
  ];
  
  const cctpV2 = new ethers.Contract(cctpV2Address, cctpV2ABI, user);
  
  try {
    const domain = await cctpV2.localDomain();
    console.log(`✅ Local Domain: ${domain} (6=Base)`);
    
    if (domain !== 6) {
      throw new Error(`Wrong domain: expected 6, got ${domain}`);
    }
    
  } catch (e) {
    console.log(`❌ Domain check failed: ${e.message}`);
    throw e;
  }
  
  // Test small transfer using CCTP v2 directly
  console.log("\n⚡ Testing Direct CCTP v2 Fast Transfer...");
  
  const amount = ethers.parseUnits("0.1", 6); // 0.1 USDC
  const recipient = user.address;
  const arbitrumDomain = 3;
  
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  
  // Check balance
  const balance = await usdcContract.balanceOf(user.address);
  console.log(`💰 USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  
  if (balance < amount) {
    throw new Error("Insufficient USDC balance");
  }
  
  // Approve CCTP v2 contract
  console.log("🔓 Approving USDC to CCTP v2...");
  const approveTx = await usdcContract.approve(cctpV2Address, amount);
  await approveTx.wait();
  console.log("✅ USDC approved");
  
  // Execute CCTP v2 fast transfer
  console.log("⚡ Executing depositForBurnWithHook()...");
  
  const mintRecipient = ethers.hexlify(ethers.zeroPadValue(recipient, 32));
  
  try {
    const fastTransferTx = await cctpV2.depositForBurnWithHook(
      amount,           // amount
      arbitrumDomain,   // destinationDomain (3 = Arbitrum)
      mintRecipient,    // mintRecipient (bytes32)
      usdcBase,         // burnToken
      ethers.ZeroHash,  // destinationCaller (no hook)
      0,                // maxFee (0 = accept any fee)
      1000              // minFinalityThreshold (1000 = FAST 8-20 seconds)
    );
    
    console.log(`📋 Fast Transfer TX: ${fastTransferTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await fastTransferTx.wait();
    console.log(`✅ Fast transfer confirmed! Block: ${receipt.blockNumber}`);
    
    const currentTime = new Date();
    console.log(`⏰ Initiated at: ${currentTime.toISOString()}`);
    
    console.log("\n" + "=".repeat(50));
    console.log("🎉 CCTP V2 FAST TRANSFER SUCCESS!");
    console.log("=".repeat(50));
    
    console.log(`📋 TX Hash: ${fastTransferTx.hash}`);
    console.log(`⚡ Using: depositForBurnWithHook() with fast threshold`);
    console.log(`🎯 Expected: 8-20 seconds completion`);
    
    console.log("\n🔍 Monitor Transfer:");
    console.log(`📡 Circle API: https://iris-api.circle.com/v1/messages/6/${fastTransferTx.hash}`);
    console.log(`📍 BaseScan: https://basescan.org/tx/${fastTransferTx.hash}`);
    console.log(`📍 Arbitrum: https://arbiscan.io/address/${recipient}`);
    
    console.log("\n⚡ SUCCESS: CCTP v2 fast transfers are working!");
    console.log("💡 Router can now use this for 8-20 second transfers");
    
  } catch (e) {
    console.log(`❌ Fast transfer failed: ${e.message}`);
    
    // Fallback: try regular depositForBurn
    console.log("\n🔄 Fallback: Testing regular depositForBurn()...");
    
    try {
      const regularTx = await cctpV2.depositForBurn(
        amount,
        arbitrumDomain,
        mintRecipient,
        usdcBase
      );
      
      console.log(`📋 Regular Transfer TX: ${regularTx.hash}`);
      const receipt = await regularTx.wait();
      console.log(`✅ Regular transfer confirmed! Block: ${receipt.blockNumber}`);
      
      console.log("💡 CCTP v2 supports regular transfers but not fast transfers");
      console.log("⏰ Expected completion: 10-20 minutes");
      
    } catch (e2) {
      console.log(`❌ Regular transfer also failed: ${e2.message}`);
      console.log("⚠️  This contract may not be a valid CCTP TokenMessenger");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
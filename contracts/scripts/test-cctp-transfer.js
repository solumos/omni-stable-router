const hre = require("hardhat");
const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

// Deployed contracts
const CONTRACTS = {
  stableRouter: "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
  routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"
};

// Test tokens
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Sepolia USDC

// Chain IDs
const CHAINS = {
  SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  BASE_SEPOLIA: 84532
};

async function main() {
  console.log("🚀 Testing CCTP Transfer\n");
  console.log("=====================================\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Sender:", signer.address);
  
  // Get USDC contract
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const usdcBalance = await usdc.balanceOf(signer.address);
  console.log("💰 USDC Balance:", formatUnits(usdcBalance, 6), "USDC\n");
  
  if (usdcBalance == 0n) {
    console.log("❌ You need test USDC!");
    console.log("   Get some from: https://faucet.circle.com");
    process.exit(1);
  }
  
  // Test parameters
  const amount = parseUnits("1", 6); // 1 USDC
  const destChainId = CHAINS.ARBITRUM_SEPOLIA; // Send to Arbitrum Sepolia
  const recipient = signer.address; // Send to same address on destination
  
  console.log("📝 Transfer Details:");
  console.log("   Amount:", formatUnits(amount, 6), "USDC");
  console.log("   From: Sepolia");
  console.log("   To: Arbitrum Sepolia");
  console.log("   Recipient:", recipient);
  console.log("\n");
  
  // Get RouteProcessor contract
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS.routeProcessor);
  
  // Step 1: Approve USDC
  console.log("1️⃣ Approving USDC...");
  const approveTx = await usdc.approve(CONTRACTS.routeProcessor, amount);
  console.log("   Tx hash:", approveTx.hash);
  await approveTx.wait();
  console.log("   ✅ Approved!\n");
  
  // Step 2: Execute CCTP transfer
  console.log("2️⃣ Executing CCTP transfer...");
  try {
    const transferTx = await routeProcessor.executeCCTP(
      USDC,           // token
      amount,         // amount
      destChainId,    // destination chain
      recipient       // recipient
    );
    
    console.log("   Tx hash:", transferTx.hash);
    console.log("   ⏳ Waiting for confirmation...");
    
    const receipt = await transferTx.wait();
    console.log("   ✅ Transfer initiated!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // Parse events
    console.log("\n📋 Events:");
    for (const log of receipt.logs) {
      try {
        const parsed = routeProcessor.interface.parseLog(log);
        if (parsed && parsed.name === "CCTPInitiated") {
          console.log("   CCTPInitiated event:");
          console.log("     - Nonce:", parsed.args.nonce.toString());
          console.log("     - Amount:", formatUnits(parsed.args.amount, 6), "USDC");
          console.log("     - Destination domain:", parsed.args.destDomain.toString());
        }
      } catch (e) {
        // Not our event, skip
      }
    }
    
    console.log("\n✅ SUCCESS! CCTP transfer initiated.");
    console.log("\n⏱️  Note: CCTP transfers take ~15 minutes to complete");
    console.log("   You can track the transfer at:");
    console.log("   https://www.circle.com/cctp (once they add testnet support)");
    console.log("\n📍 Check destination balance on Arbitrum Sepolia in ~15 minutes");
    
  } catch (error) {
    console.error("❌ Transfer failed:", error.message);
    
    if (error.message.includes("Invalid destination domain")) {
      console.log("\n💡 This chain might not be configured for CCTP yet");
      console.log("   Try sending to a different testnet");
    } else if (error.message.includes("insufficient allowance")) {
      console.log("\n💡 Approval might have failed. Try again.");
    }
  }
  
  // Check final balance
  const finalBalance = await usdc.balanceOf(signer.address);
  console.log("\n💰 Final USDC Balance:", formatUnits(finalBalance, 6), "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
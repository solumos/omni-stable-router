const { ethers } = require("hardhat");
const { formatUnits } = require("ethers");

async function main() {
  const txHash = "0x0a0b79be0107bf9d401f3dde5aefd9b5bca0488dcdaf92e02be48c7860b94678";
  
  console.log("🔍 Verifying CCTP Transaction");
  console.log("================================");
  console.log("Transaction:", txHash);
  
  // Get transaction receipt
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  
  if (!receipt) {
    console.log("❌ Transaction not found");
    return;
  }
  
  console.log("\n📋 Transaction Details:");
  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
  console.log("Block:", receipt.blockNumber);
  console.log("Gas Used:", receipt.gasUsed.toString());
  console.log("From:", receipt.from);
  console.log("To:", receipt.to);
  
  // Get the RouteProcessor contract to parse events
  const routeProcessor = await ethers.getContractAt(
    "RouteProcessor",
    "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"
  );
  
  console.log("\n📜 Events Emitted:");
  console.log("Total events:", receipt.logs.length);
  
  // Try to parse each log
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`\nEvent ${i + 1}:`);
    console.log("  Address:", log.address);
    console.log("  Topics:", log.topics.length);
    
    try {
      // Try to parse with RouteProcessor interface
      const parsed = routeProcessor.interface.parseLog(log);
      if (parsed) {
        console.log("  ✅ Parsed as:", parsed.name);
        console.log("  Args:", parsed.args);
        
        if (parsed.name === "CCTPInitiated") {
          console.log("\n🎯 CCTP Transfer Details:");
          console.log("  Token:", parsed.args.token);
          console.log("  Amount:", formatUnits(parsed.args.amount, 6), "USDC");
          console.log("  Destination Chain:", parsed.args.destChainId?.toString());
          console.log("  Recipient:", parsed.args.recipient);
          console.log("  Nonce:", parsed.args.nonce?.toString());
        }
      }
    } catch (e) {
      // Not a RouteProcessor event, try to decode topic
      if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
        console.log("  ✅ ERC20 Transfer Event");
        try {
          // Decode Transfer event
          const from = "0x" + log.topics[1].slice(26);
          const to = "0x" + log.topics[2].slice(26);
          const amount = ethers.toBigInt(log.data);
          console.log("    From:", from);
          console.log("    To:", to);
          console.log("    Amount:", formatUnits(amount, 6), "USDC");
        } catch (e) {
          console.log("    Could not decode transfer details");
        }
      } else if (log.topics[0] === "0x2fa9ca894982930190727e75500a97d8dc500233a5065e0f3126c48fbe0343c0") {
        console.log("  ✅ CCTP DepositForBurn Event");
      }
    }
  }
  
  // Check if this was a failed transaction that still consumed gas
  if (receipt.status === 0) {
    console.log("\n⚠️ Transaction failed but still consumed gas");
    console.log("This could mean the function reverted after some state changes");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
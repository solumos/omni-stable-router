const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Checking transaction status...\n");
  console.log("Address:", signer.address);
  
  // Get current nonce (includes pending)
  const pendingNonce = await ethers.provider.getTransactionCount(signer.address, "pending");
  const confirmedNonce = await ethers.provider.getTransactionCount(signer.address, "latest");
  
  console.log("Confirmed transactions:", confirmedNonce);
  console.log("Including pending:", pendingNonce);
  
  if (pendingNonce > confirmedNonce) {
    console.log("\n⏳ You have", pendingNonce - confirmedNonce, "pending transaction(s)");
    console.log("\nOptions:");
    console.log("1. Wait a few minutes for them to confirm");
    console.log("2. Speed up the transaction in MetaMask");
    console.log("3. Cancel in MetaMask (send 0 ETH to yourself with same nonce)");
    console.log("4. Use --reset flag in deployment (if we add it)");
  } else {
    console.log("\n✅ No pending transactions");
    console.log("You can retry the deployment now");
  }
  
  // Check Base Sepolia explorer
  console.log("\n🔗 Check your transactions:");
  console.log(`https://sepolia.basescan.org/address/${signer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
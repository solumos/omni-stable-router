const { ethers } = require("hardhat");

async function main() {
  console.log("Testing Sepolia connection...\n");
  
  const [signer] = await ethers.getSigners();
  console.log("Address:", signer.address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  // Get block number
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Current block:", blockNumber);
  
  // Get gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("Gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  console.log("Max fee:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
  
  // Test a simple transaction
  console.log("\nSending test transaction...");
  const tx = await signer.sendTransaction({
    to: signer.address,
    value: ethers.parseEther("0.00001")
  });
  console.log("TX sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("TX confirmed in block:", receipt.blockNumber);
  
  console.log("\n✅ Network connection working!");
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
const { ethers } = require("hardhat");

async function main() {
  try {
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);
    
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("ETH Balance:", ethers.formatEther(balance));
    
    // Try to read USDC balance
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const usdc = await ethers.getContractAt("IERC20", USDC);
    const usdcBalance = await usdc.balanceOf(signer.address);
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    console.log("\n✅ Read operations still work!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("quota")) {
      console.log("\n⚠️ Tenderly quota exceeded. Options:");
      console.log("1. Wait for quota reset");
      console.log("2. Upgrade Tenderly plan");
      console.log("3. Switch to public testnets");
      console.log("4. Use local Hardhat mainnet fork");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function main() {
  console.log("Checking user USDC balance and allowance...\n");
  
  const userAddress = "0xFC825D166f219ea5Aa75d993609eae546E013cEE";
  const routerAddress = "0x6e572fb734be64ec1465d1472ed40f41b74dd83e";
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  console.log("User:", userAddress);
  console.log("Router:", routerAddress);
  console.log("USDC:", USDC_BASE);
  
  // Check USDC balance and allowance
  const usdc = await ethers.getContractAt("IERC20", USDC_BASE);
  
  try {
    const balance = await usdc.balanceOf(userAddress);
    const allowance = await usdc.allowance(userAddress, routerAddress);
    
    console.log("\n📊 USDC Status:");
    console.log("  Balance:", ethers.formatUnits(balance, 6), "USDC");
    console.log("  Allowance:", ethers.formatUnits(allowance, 6), "USDC");
    
    if (balance === BigInt(0)) {
      console.log("\n❌ User has no USDC! Need to fund the account first.");
    } else if (allowance === BigInt(0)) {
      console.log("\n⚠️  User has USDC but no allowance set for router.");
    } else {
      console.log("\n✅ User has USDC and allowance set!");
    }
  } catch (e) {
    console.log("❌ Error checking USDC:", e.message);
  }
  
  // Try a simple transfer simulation
  console.log("\n🧪 Testing transfer simulation...");
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  try {
    const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
    const amount = ethers.parseUnits("1", 6); // 1 USDC
    
    // Check if we can simulate a transfer call
    const result = await router.transfer.staticCall(
      USDC_BASE,    // fromToken
      USDC_ARB,     // toToken
      amount,       // amount
      31338,        // toChainId
      userAddress,  // recipient
      { from: userAddress }
    );
    
    console.log("✅ Transfer simulation successful!");
  } catch (e) {
    console.log("❌ Transfer simulation failed:", e.message);
    if (e.reason) console.log("   Reason:", e.reason);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
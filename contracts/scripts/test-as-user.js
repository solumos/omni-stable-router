const { ethers } = require("hardhat");

async function main() {
  console.log("Testing transfer as user account...\n");
  
  const userAddress = "0xFC825D166f219ea5Aa75d993609eae546E013cEE";
  const routerAddress = "0x6e572fb734be64ec1465d1472ed40f41b74dd83e";
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  // Impersonate the user account
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [userAddress],
  });
  
  const userSigner = await ethers.getSigner(userAddress);
  console.log("Impersonating:", userAddress);
  console.log("ETH balance:", ethers.formatEther(await ethers.provider.getBalance(userAddress)));
  
  // Get contracts
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdc = await ethers.getContractAt("IERC20", USDC_BASE);
  
  // Check current state
  const balance = await usdc.balanceOf(userAddress);
  const allowance = await usdc.allowance(userAddress, routerAddress);
  console.log("USDC balance:", ethers.formatUnits(balance, 6));
  console.log("USDC allowance:", ethers.formatUnits(allowance, 6));
  
  // Test the exact same transaction the frontend would send
  console.log("\n🧪 Testing exact frontend transaction...");
  
  try {
    const amount = ethers.parseUnits("1", 6); // 1 USDC
    
    // This is exactly what the frontend does
    console.log("1. Calling transfer function...");
    const tx = await router.connect(userSigner).transfer(
      USDC_BASE,    // fromToken
      USDC_ARB,     // toToken  
      amount,       // amount
      31338,        // toChainId
      userAddress,  // recipient
      {
        value: 0,   // No ETH value
        gasLimit: 300000  // Reasonable gas limit
      }
    );
    
    console.log("✅ Transaction sent! Hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed! Gas used:", receipt.gasUsed.toString());
    
  } catch (e) {
    console.log("❌ Transaction failed:", e.message);
    if (e.reason) console.log("   Reason:", e.reason);
    if (e.code) console.log("   Code:", e.code);
    
    // Try to get more details about the revert
    if (e.data) {
      try {
        const decoded = router.interface.parseError(e.data);
        console.log("   Decoded error:", decoded);
      } catch (decodeErr) {
        console.log("   Raw error data:", e.data);
      }
    }
  }
  
  // Stop impersonation
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount", 
    params: [userAddress],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
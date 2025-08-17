const { ethers } = require("hardhat");

async function main() {
  console.log("Testing UnifiedRouter transfer function directly...\n");
  
  const [signer] = await ethers.getSigners();
  const routerAddress = "0x6e572fb734be64ec1465d1472ed40f41b74dd83e";
  const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log("Signer:", signer.address);
  console.log("Router:", routerAddress);
  
  // Get contracts
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdc = await ethers.getContractAt("IERC20", USDC_BASE);
  
  // Check signer's USDC balance
  const balance = await usdc.balanceOf(signer.address);
  console.log("Signer USDC balance:", ethers.formatUnits(balance, 6));
  
  if (balance === BigInt(0)) {
    console.log("❌ Signer has no USDC. Let's send some from the whale account...");
    
    // Get some USDC for the signer
    const whaleAddress = "0xFC825D166f219ea5Aa75d993609eae546E013cEE";
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [whaleAddress],
    });
    
    const whale = await ethers.getSigner(whaleAddress);
    const transferAmount = ethers.parseUnits("100", 6); // 100 USDC
    
    await usdc.connect(whale).transfer(signer.address, transferAmount);
    console.log("✅ Transferred 100 USDC to signer");
    
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount", 
      params: [whaleAddress],
    });
  }
  
  // Approve router to spend USDC
  const amount = ethers.parseUnits("1", 6); // 1 USDC
  console.log("\n1. Approving router to spend USDC...");
  const approveTx = await usdc.approve(routerAddress, amount);
  await approveTx.wait();
  console.log("✅ Approval confirmed");
  
  // Check allowance
  const allowance = await usdc.allowance(signer.address, routerAddress);
  console.log("Allowance:", ethers.formatUnits(allowance, 6), "USDC");
  
  // Test the transfer function
  console.log("\n2. Testing transfer function...");
  
  try {
    console.log("Parameters:");
    console.log("  fromToken:", USDC_BASE);
    console.log("  toToken:", USDC_ARB);
    console.log("  amount:", ethers.formatUnits(amount, 6), "USDC");
    console.log("  toChainId:", 31338);
    console.log("  recipient:", signer.address);
    
    const tx = await router.transfer(
      USDC_BASE,    // fromToken
      USDC_ARB,     // toToken
      amount,       // amount  
      31338,        // toChainId
      signer.address, // recipient
      {
        value: 0,
        gasLimit: 500000
      }
    );
    
    console.log("✅ Transaction sent! Hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   Status:", receipt.status);
    
    // Check events
    if (receipt.logs.length > 0) {
      console.log("   Events emitted:", receipt.logs.length);
      for (const log of receipt.logs) {
        try {
          const parsed = router.interface.parseLog(log);
          console.log("   -", parsed.name, parsed.args);
        } catch (e) {
          // Ignore unparseable logs
        }
      }
    }
    
  } catch (e) {
    console.log("❌ Transaction failed:", e.message);
    if (e.reason) console.log("   Reason:", e.reason);
    
    // Get more detailed error info
    if (e.data) {
      console.log("   Error data:", e.data);
    }
    
    // Check if the route is actually configured
    console.log("\n🔍 Debugging route configuration...");
    try {
      const isConfigured = await router.isRouteConfigured(USDC_BASE, 31337, USDC_ARB, 31338);
      console.log("   Route configured:", isConfigured);
      
      if (!isConfigured) {
        console.log("❌ Route is not configured! This is the problem.");
      }
    } catch (routeErr) {
      console.log("   Error checking route:", routeErr.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
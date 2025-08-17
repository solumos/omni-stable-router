const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

async function testDebugRouter() {
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Testing Debug Router");
  console.log("========================");
  
  // Deploy debug router
  console.log("Deploying DebugRouter...");
  const DebugRouter = await ethers.getContractFactory("DebugRouter");
  const debugRouter = await DebugRouter.deploy();
  await debugRouter.waitForDeployment();
  const debugRouterAddress = await debugRouter.getAddress();
  console.log("DebugRouter deployed at:", debugRouterAddress);
  
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdc = await ethers.getContractAt("IERC20", USDC);
  
  const amount = parseUnits("1", 6);
  
  // Approve the debug router
  console.log("\nApproving DebugRouter...");
  const approveTx = await usdc.approve(debugRouterAddress, amount);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // Check state
  const balance = await usdc.balanceOf(signer.address);
  const allowance = await usdc.allowance(signer.address, debugRouterAddress);
  console.log("\nPre-test state:");
  console.log("  Balance:", formatUnits(balance, 6), "USDC");
  console.log("  Allowance:", formatUnits(allowance, 6), "USDC");
  
  // Test regular transferFrom
  console.log("\n1. Testing regular transferFrom:");
  try {
    const tx1 = await debugRouter.testTransfer(USDC, amount);
    const receipt1 = await tx1.wait();
    console.log("   ✅ Success! Gas used:", receipt1.gasUsed.toString());
    
    // Parse events
    for (const log of receipt1.logs) {
      try {
        const parsed = debugRouter.interface.parseLog(log);
        if (parsed && parsed.name === "Debug") {
          console.log(`   ${parsed.args.message}: ${parsed.args.value}`);
        } else if (parsed && parsed.name === "DebugAddress") {
          console.log(`   ${parsed.args.message}: ${parsed.args.value}`);
        }
      } catch (e) {
        // Not our event
      }
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }
  
  // Reset by sending USDC back if transfer succeeded
  const debugRouterBalance = await usdc.balanceOf(debugRouterAddress);
  if (debugRouterBalance > 0n) {
    console.log("\nResetting - transferring USDC back...");
    // We need to act as the debug router to send back
    // This won't work directly, so let's just test with what we have
  }
  
  // Test safeTransferFrom
  console.log("\n2. Testing safeTransferFrom:");
  
  // Re-approve if needed
  const currentAllowance = await usdc.allowance(signer.address, debugRouterAddress);
  if (currentAllowance < amount) {
    console.log("Re-approving...");
    await (await usdc.approve(debugRouterAddress, amount)).wait();
  }
  
  try {
    const tx2 = await debugRouter.testSafeTransfer(USDC, amount);
    const receipt2 = await tx2.wait();
    console.log("   ✅ Success! Gas used:", receipt2.gasUsed.toString());
    
    // Parse events
    for (const log of receipt2.logs) {
      try {
        const parsed = debugRouter.interface.parseLog(log);
        if (parsed && parsed.name === "Debug") {
          console.log(`   ${parsed.args.message}: ${parsed.args.value}`);
        } else if (parsed && parsed.name === "DebugAddress") {
          console.log(`   ${parsed.args.message}: ${parsed.args.value}`);
        }
      } catch (e) {
        // Not our event
      }
    }
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
    
    // Try to decode the error
    if (error.data) {
      try {
        const decoded = debugRouter.interface.parseError(error.data);
        console.log("   Decoded error:", decoded);
      } catch (e) {
        console.log("   Raw error data:", error.data);
      }
    }
  }
  
  // Final state
  console.log("\nFinal state:");
  const finalBalance = await usdc.balanceOf(signer.address);
  const routerBalance = await usdc.balanceOf(debugRouterAddress);
  console.log("  User balance:", formatUnits(finalBalance, 6), "USDC");
  console.log("  DebugRouter balance:", formatUnits(routerBalance, 6), "USDC");
}

async function main() {
  await testDebugRouter();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
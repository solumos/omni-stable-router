const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

async function testSameChainSwap() {
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;
  
  console.log("🔄 Testing Same-Chain Swap");
  console.log("===========================");
  console.log("Network:", network);
  console.log("Signer:", signer.address);
  
  // Get router address from deployment
  const routerAddress = "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8"; // Base fork router
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Token addresses on Base mainnet
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const DAI = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb";
  
  // Mock DEX pool (Uniswap V3 USDC/DAI pool on Base)
  const SWAP_POOL = "0x4C36388bE6589165B814288cEaAC141857499aBf"; // Example pool
  
  console.log("\n📝 Configuration:");
  console.log("Router:", routerAddress);
  console.log("USDC:", USDC);
  console.log("DAI:", DAI);
  console.log("Swap Pool:", SWAP_POOL);
  
  // Configure same-chain swap pool
  console.log("\n⚙️  Configuring same-chain swap pool...");
  try {
    const tx = await router.setSameChainSwapPool(USDC, DAI, SWAP_POOL);
    await tx.wait();
    console.log("✅ Swap pool configured");
  } catch (error) {
    console.log("⚠️  Pool might already be configured:", error.message);
  }
  
  // Check balances
  const usdcContract = await ethers.getContractAt("IERC20", USDC);
  const daiContract = await ethers.getContractAt("IERC20", DAI);
  
  const usdcBalance = await usdcContract.balanceOf(signer.address);
  const daiBalance = await daiContract.balanceOf(signer.address);
  
  console.log("\n💰 Balances:");
  console.log("USDC:", formatUnits(usdcBalance, 6));
  console.log("DAI:", formatUnits(daiBalance, 18));
  
  if (usdcBalance == 0n) {
    console.log("\n⚠️  No USDC balance. Getting some from a whale...");
    
    // Impersonate a whale account (Base USDC whale)
    const whaleAddress = "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A"; // Example whale
    
    try {
      // Use Tenderly's impersonation
      await ethers.provider.send("tenderly_setBalance", [
        [whaleAddress],
        ethers.toQuantity(ethers.parseEther("10"))
      ]);
      
      await ethers.provider.send("hardhat_impersonateAccount", [whaleAddress]);
      const whale = await ethers.getSigner(whaleAddress);
      
      // Transfer USDC from whale to our account
      const amount = parseUnits("100", 6); // 100 USDC
      const usdcAsWhale = usdcContract.connect(whale);
      await usdcAsWhale.transfer(signer.address, amount);
      
      console.log("✅ Received 100 USDC from whale");
      
      await ethers.provider.send("hardhat_stopImpersonatingAccount", [whaleAddress]);
    } catch (error) {
      console.log("❌ Could not get USDC:", error.message);
      return;
    }
  }
  
  // Test same-chain swap: USDC -> DAI
  console.log("\n🔄 Testing USDC → DAI swap on same chain...");
  
  const swapAmount = parseUnits("10", 6); // 10 USDC
  
  // Approve router
  console.log("Approving router...");
  const approveTx = await usdcContract.approve(routerAddress, swapAmount);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // Execute same-chain swap
  console.log("\nExecuting swap...");
  console.log("From: USDC");
  console.log("To: DAI");
  console.log("Amount:", formatUnits(swapAmount, 6), "USDC");
  console.log("Chain:", "Same (Base)");
  
  try {
    const tx = await router.transfer(
      USDC,                    // fromToken
      DAI,                     // toToken
      swapAmount,              // amount
      await ethers.provider.getNetwork().then(n => n.chainId), // same chain ID
      signer.address,          // recipient
      { value: 0 }
    );
    
    console.log("\n📤 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Swap executed!");
    
    // Parse events
    for (const log of receipt.logs) {
      try {
        const parsed = router.interface.parseLog(log);
        if (parsed && parsed.name === "SameChainSwapExecuted") {
          console.log("\n📋 SameChainSwapExecuted Event:");
          console.log("Transfer ID:", parsed.args.transferId);
          console.log("Amount In:", formatUnits(parsed.args.amountIn, 6), "USDC");
          console.log("Amount Out:", formatUnits(parsed.args.amountOut, 18), "DAI");
        }
      } catch (e) {
        // Other events
      }
    }
    
    // Check new balances
    const newUsdcBalance = await usdcContract.balanceOf(signer.address);
    const newDaiBalance = await daiContract.balanceOf(signer.address);
    
    console.log("\n💰 New Balances:");
    console.log("USDC:", formatUnits(newUsdcBalance, 6), "(was", formatUnits(usdcBalance, 6) + ")");
    console.log("DAI:", formatUnits(newDaiBalance, 18), "(was", formatUnits(daiBalance, 18) + ")");
    
  } catch (error) {
    console.error("❌ Swap failed:", error.message);
    
    if (error.message.includes("No swap pool configured")) {
      console.log("→ Need to configure swap pool for this pair");
    }
  }
}

async function main() {
  await testSameChainSwap();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
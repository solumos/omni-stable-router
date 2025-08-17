const { ethers } = require("hardhat");

async function main() {
  console.log("💱 SWAP USDC FOR TEST TOKENS ON BASE");
  console.log("=====================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Token addresses on Base
  const tokens = {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // Bridged USDC
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // Coinbase ETH
  };
  
  // Uniswap V3 on Base
  const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";
  const SWAP_ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
  ];
  
  console.log(`👤 User: ${user.address}\n`);
  
  // Check USDC balance
  const usdcContract = await ethers.getContractAt("IERC20", tokens.USDC);
  const usdcBalance = await usdcContract.balanceOf(user.address);
  
  console.log(`💰 USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC\n`);
  
  if (usdcBalance < ethers.parseUnits("0.5", 6)) {
    console.log("❌ Insufficient USDC (need at least 0.5 USDC)");
    return;
  }
  
  // Swap 0.5 USDC for WETH as a test
  const swapAmount = ethers.parseUnits("0.5", 6);
  const targetToken = "WETH";
  const targetAddress = tokens[targetToken];
  
  console.log(`🔄 Swapping 0.5 USDC for ${targetToken}...`);
  console.log(`   Using Uniswap V3 on Base\n`);
  
  // Approve USDC
  console.log("🔓 Approving USDC...");
  const approveTx = await usdcContract.approve(UNISWAP_V3_ROUTER, swapAmount);
  await approveTx.wait();
  console.log("✅ Approved\n");
  
  // Setup swap parameters
  const swapRouter = new ethers.Contract(UNISWAP_V3_ROUTER, SWAP_ROUTER_ABI, user);
  
  const params = {
    tokenIn: tokens.USDC,
    tokenOut: targetAddress,
    fee: 500, // 0.05% fee tier (try 3000 for 0.3% if this fails)
    recipient: user.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn: swapAmount,
    amountOutMinimum: 0, // Accept any amount for testing
    sqrtPriceLimitX96: 0
  };
  
  try {
    console.log("🚀 Executing swap...");
    const swapTx = await swapRouter.exactInputSingle(params);
    console.log(`📋 TX: ${swapTx.hash}`);
    
    const receipt = await swapTx.wait();
    console.log(`✅ Swap confirmed in block ${receipt.blockNumber}`);
    
    // Check new balance
    const targetContract = await ethers.getContractAt("IERC20", targetAddress);
    const newBalance = await targetContract.balanceOf(user.address);
    
    console.log(`\n💰 Received: ${ethers.formatUnits(newBalance, 18)} ${targetToken}`);
    console.log(`🔗 View on BaseScan: https://basescan.org/tx/${swapTx.hash}`);
    
    console.log("\n✅ Swap successful!");
    console.log(`You now have ${targetToken} for testing cross-chain transfers`);
    
  } catch (error) {
    console.log("❌ Swap failed:", error.message);
    
    if (error.message.includes("STF")) {
      console.log("\n💡 Try a different fee tier:");
      console.log("   - Change fee from 500 to 3000 (0.3%)");
      console.log("   - Or try 10000 (1%) for exotic pairs");
    }
    
    // Try alternative: direct WETH wrap
    if (targetToken === "WETH") {
      console.log("\n🔄 Alternative: Wrap ETH directly...");
      
      const wethContract = new ethers.Contract(
        tokens.WETH,
        ["function deposit() payable"],
        user
      );
      
      try {
        const wrapTx = await wethContract.deposit({ value: ethers.parseEther("0.0001") });
        await wrapTx.wait();
        console.log("✅ Successfully wrapped 0.0001 ETH to WETH");
      } catch (e) {
        console.log("❌ WETH wrap also failed");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
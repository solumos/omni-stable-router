const { ethers } = require("hardhat");

async function main() {
  console.log("💱 Swapping USDC for USDe on Base Sepolia");
  console.log("=========================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 84532) {
    throw new Error("This script is for Base Sepolia only (84532)");
  }
  
  // Base Sepolia addresses
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const USDE = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"; // USDe on Base Sepolia
  const UNISWAP_ROUTER = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // Uniswap V3 Router
  const WETH = "0x4200000000000000000000000000000000000006"; // WETH on Base
  
  const [signer] = await ethers.getSigners();
  
  console.log("👤 User:", signer.address);
  console.log("🌐 Network: Base Sepolia");
  console.log("💰 ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)));
  
  // Get contracts
  const usdc = await ethers.getContractAt([
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ], USDC);
  
  const usde = await ethers.getContractAt([
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
  ], USDE);
  
  // Check balances
  console.log("\n💰 Current Balances:");
  const usdcBalance = await usdc.balanceOf(signer.address);
  const usdeBalance = await usde.balanceOf(signer.address);
  
  console.log(`USDC: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`USDe: ${ethers.formatUnits(usdeBalance, 18)} USDe`);
  
  if (usdcBalance === BigInt(0)) {
    console.log("❌ No USDC found! Get testnet USDC from https://faucet.circle.com/");
    return;
  }
  
  // Swap amount (0.1 USDC)
  const swapAmount = ethers.parseUnits("0.1", 6);
  if (usdcBalance < swapAmount) {
    console.log(`❌ Insufficient USDC! Need at least ${ethers.formatUnits(swapAmount, 6)} USDC`);
    return;
  }
  
  console.log(`\n🔄 Swapping ${ethers.formatUnits(swapAmount, 6)} USDC for USDe...`);
  
  // Uniswap V3 Router interface
  const routerABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
  ];
  
  const uniswapRouter = await ethers.getContractAt(routerABI, UNISWAP_ROUTER);
  
  // Step 1: Approve USDC
  console.log("1️⃣ Approving USDC...");
  const allowance = await usdc.allowance(signer.address, UNISWAP_ROUTER);
  
  if (allowance < swapAmount) {
    const approveTx = await usdc.approve(UNISWAP_ROUTER, swapAmount);
    await approveTx.wait();
    console.log("✅ USDC approved");
  } else {
    console.log("✅ USDC already approved");
  }
  
  // Step 2: Execute swap
  console.log("2️⃣ Executing swap...");
  
  // Swap parameters
  const swapParams = {
    tokenIn: USDC,
    tokenOut: USDE,
    fee: 3000, // 0.3% fee tier
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    amountIn: swapAmount,
    amountOutMinimum: 0, // Accept any amount of USDe (for testing)
    sqrtPriceLimitX96: 0 // No price limit
  };
  
  try {
    const swapTx = await uniswapRouter.exactInputSingle(swapParams, {
      gasLimit: 300000 // Conservative gas limit
    });
    
    console.log(`📋 Swap transaction: ${swapTx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await swapTx.wait();
    console.log(`✅ Swap completed! (Block: ${receipt.blockNumber})`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check new balances
    console.log("\n💰 New Balances:");
    const newUsdcBalance = await usdc.balanceOf(signer.address);
    const newUsdeBalance = await usde.balanceOf(signer.address);
    
    console.log(`USDC: ${ethers.formatUnits(newUsdcBalance, 6)} USDC`);
    console.log(`USDe: ${ethers.formatUnits(newUsdeBalance, 18)} USDe`);
    
    const usdcSpent = usdcBalance - newUsdcBalance;
    const usdeReceived = newUsdeBalance - usdeBalance;
    
    console.log(`\n📊 Swap Results:`);
    console.log(`Spent: ${ethers.formatUnits(usdcSpent, 6)} USDC`);
    console.log(`Received: ${ethers.formatUnits(usdeReceived, 18)} USDe`);
    
    if (usdeReceived > 0) {
      console.log("✅ Successfully swapped USDC for USDe!");
      console.log("\n🎯 Now you can test LayerZero compose functionality:");
      console.log("1. USDe → USDC cross-chain swaps");
      console.log("2. Cross-chain compose messages");
      console.log("3. End-to-end LayerZero testing");
    } else {
      console.log("❌ No USDe received - swap may have failed");
    }
    
  } catch (e) {
    console.log("❌ Swap failed:", e.message);
    
    // Try alternative approach - check if there's a direct USDC/USDe pool
    console.log("\n🔍 Checking alternative swap routes...");
    console.log("💡 If direct swap fails, you might need to:");
    console.log("1. Swap USDC → WETH → USDe (multi-hop)");
    console.log("2. Use a different DEX (Curve, etc.)");
    console.log("3. Check if USDe liquidity exists on Base Sepolia");
    console.log("4. Use a testnet faucet for USDe if available");
  }
  
  console.log(`\n🔗 View transaction: https://sepolia.basescan.org/tx/${swapTx?.hash || 'N/A'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
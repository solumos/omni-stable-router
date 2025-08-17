const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 LAYERZERO COMPOSE TEST: USDe (Base) → USDC (Arbitrum)");
  console.log("========================================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Configuration
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdeBase = "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34"; // USDe OFT on Base
  const usdcArbitrum = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; // USDC on Arbitrum
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  const usdeContract = await ethers.getContractAt("IERC20", usdeBase);
  
  // Check balances
  const usdcBalance = await usdcContract.balanceOf(user.address);
  const usdeBalance = await usdeContract.balanceOf(user.address);
  
  console.log("💰 Current Balances:");
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`   USDe: ${ethers.formatUnits(usdeBalance, 18)} USDe\n`);
  
  // Step 1: If no USDe, try to swap some USDC for USDe
  if (usdeBalance < ethers.parseUnits("0.1", 18)) {
    console.log("📝 Step 1: Need to acquire USDe on Base");
    console.log("=========================================\n");
    
    if (usdcBalance < ethers.parseUnits("0.5", 6)) {
      console.log("❌ Insufficient USDC balance (need at least 0.5 USDC)");
      return;
    }
    
    // Try multiple DEXes to find USDe liquidity
    console.log("🔍 Searching for USDC/USDe liquidity on Base...\n");
    
    // Option 1: Try Aerodrome (Base's main DEX)
    const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43";
    
    console.log("💱 Attempting swap via Aerodrome...");
    const swapAmount = ethers.parseUnits("0.5", 6); // 0.5 USDC
    
    // Approve USDC to Aerodrome
    console.log("🔓 Approving USDC to Aerodrome...");
    const approveTx = await usdcContract.approve(AERODROME_ROUTER, swapAmount);
    await approveTx.wait();
    console.log("✅ Approved\n");
    
    // Check if direct pool exists
    const AERODROME_FACTORY = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da";
    const factoryABI = [
      "function getPool(address tokenA, address tokenB, bool stable) view returns (address pool)"
    ];
    
    const factory = new ethers.Contract(AERODROME_FACTORY, factoryABI, ethers.provider);
    
    // Check for stable pool (likely for stablecoins)
    const stablePool = await factory.getPool(usdcBase, usdeBase, true);
    const volatilePool = await factory.getPool(usdcBase, usdeBase, false);
    
    console.log(`📊 Pool check:`);
    console.log(`   Stable pool: ${stablePool}`);
    console.log(`   Volatile pool: ${volatilePool}\n`);
    
    if (stablePool === ethers.ZeroAddress && volatilePool === ethers.ZeroAddress) {
      console.log("⚠️  No direct USDC/USDe pool on Aerodrome\n");
      
      // Option 2: Try multi-hop through WETH
      console.log("🔄 Trying multi-hop: USDC → WETH → USDe...");
      
      const WETH = "0x4200000000000000000000000000000000000006";
      
      const aerodromeABI = [
        "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, (address from, address to, bool stable, address factory)[] routes, address to, uint256 deadline) returns (uint256[] amounts)"
      ];
      
      const aerodrome = new ethers.Contract(AERODROME_ROUTER, aerodromeABI, user);
      
      // Multi-hop route
      const routes = [
        {
          from: usdcBase,
          to: WETH,
          stable: false, // USDC/WETH usually volatile
          factory: AERODROME_FACTORY
        },
        {
          from: WETH,
          to: usdeBase,
          stable: false, // WETH/USDe likely volatile
          factory: AERODROME_FACTORY
        }
      ];
      
      const deadline = Math.floor(Date.now() / 1000) + 300;
      
      try {
        console.log("🚀 Executing multi-hop swap...");
        const swapTx = await aerodrome.swapExactTokensForTokens(
          swapAmount,
          0, // Accept any amount for testing
          routes,
          user.address,
          deadline
        );
        
        console.log(`📋 Swap TX: ${swapTx.hash}`);
        const receipt = await swapTx.wait();
        console.log(`✅ Swap confirmed!\n`);
        
        const newUsdeBalance = await usdeContract.balanceOf(user.address);
        console.log(`💰 New USDe balance: ${ethers.formatUnits(newUsdeBalance, 18)} USDe\n`);
        
      } catch (swapError) {
        console.log(`❌ Multi-hop swap failed: ${swapError.message}\n`);
        
        // Option 3: Direct purchase from Ethena protocol
        console.log("💡 Alternative: Purchase USDe directly from Ethena");
        console.log("   Visit: https://app.ethena.fi/mint");
        console.log("   Or bridge USDe from Ethereum\n");
        
        // For testing, let's just demonstrate the Compose setup
        console.log("📝 For demo purposes, configuring the route anyway...\n");
      }
    }
  }
  
  // Step 2: Configure LayerZero Compose route for USDe → USDC
  console.log("🔧 CONFIGURING LAYERZERO COMPOSE ROUTE");
  console.log("======================================");
  console.log("Route: USDe (Base) → USDC (Arbitrum)");
  console.log("Process: Bridge USDe → Swap to USDC on Arbitrum\n");
  
  const isConfigured = await router.isRouteConfigured(
    usdeBase,
    8453,
    usdcArbitrum,
    42161
  );
  
  if (!isConfigured) {
    console.log("⚙️  Configuring LayerZero Compose route...");
    
    const route = {
      protocol: 3, // Protocol.LAYERZERO_COMPOSE
      protocolDomain: 30110, // Arbitrum LZ chain ID
      bridgeContract: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7", // LZ endpoint on Base
      poolId: 0,
      swapPool: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 SwapRouter on Arbitrum
      extraData: ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint24", "address"], 
        [
          500, // 0.05% fee tier for USDe/USDC swap
          "0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34" // USDe address on Arbitrum for intermediate
        ]
      )
    };
    
    try {
      const configTx = await router.configureRoute(
        usdeBase,
        8453,
        usdcArbitrum,
        42161,
        route
      );
      await configTx.wait();
      console.log("✅ LayerZero Compose route configured!\n");
    } catch (e) {
      console.log(`⚠️  Route configuration failed: ${e.message}\n`);
    }
  } else {
    console.log("✅ Route already configured\n");
  }
  
  // Step 3: If we have USDe, execute the Compose transfer
  const currentUsdeBalance = await usdeContract.balanceOf(user.address);
  
  if (currentUsdeBalance >= ethers.parseUnits("0.01", 18)) {
    console.log("🚀 EXECUTING LAYERZERO COMPOSE TRANSFER");
    console.log("=======================================");
    console.log(`📤 From: ${ethers.formatUnits(currentUsdeBalance, 18)} USDe on Base`);
    console.log(`📥 To: ~equivalent USDC on Arbitrum`);
    console.log(`👤 Recipient: ${user.address}\n`);
    
    const transferAmount = ethers.parseUnits("0.01", 18); // Transfer 0.01 USDe
    
    // Approve router
    console.log("🔓 Approving USDe to router...");
    const approveRouterTx = await usdeContract.approve(routerAddress, transferAmount);
    await approveRouterTx.wait();
    console.log("✅ Approved\n");
    
    // Estimate LayerZero fee
    const lzFee = ethers.parseEther("0.002"); // ~0.002 ETH for cross-chain message
    console.log(`💸 LayerZero fee: ${ethers.formatEther(lzFee)} ETH\n`);
    
    try {
      console.log("📡 Sending LayerZero Compose transaction...");
      const startTime = Date.now();
      
      const transferTx = await router.transfer(
        usdeBase,     // fromToken: USDe on Base
        usdcArbitrum, // toToken: USDC on Arbitrum (different token!)
        transferAmount,
        42161,        // Arbitrum chain ID
        user.address,
        { value: lzFee }
      );
      
      console.log(`📋 TX Hash: ${transferTx.hash}`);
      console.log(`🔗 BaseScan: https://basescan.org/tx/${transferTx.hash}`);
      console.log("⏳ Waiting for confirmation...\n");
      
      const receipt = await transferTx.wait();
      const elapsed = (Date.now() - startTime) / 1000;
      
      console.log(`✅ Transaction confirmed!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed}`);
      console.log(`   Time: ${elapsed} seconds\n`);
      
      console.log("🎉 LAYERZERO COMPOSE TRANSFER INITIATED!");
      console.log("=========================================");
      console.log("\nWhat happens next:");
      console.log("1. ⏳ LayerZero relayers pick up the message (5-10s)");
      console.log("2. 🌉 Message delivered to Arbitrum (20-40s)");
      console.log("3. 💱 USDe automatically swapped to USDC via Uniswap");
      console.log("4. 💰 USDC delivered to your address");
      console.log("\nTotal expected time: 30-60 seconds");
      console.log("\nTrack progress:");
      console.log(`• LayerZero: https://layerzeroscan.com/tx/${transferTx.hash}`);
      console.log(`• Arbitrum: https://arbiscan.io/address/${user.address}`);
      
    } catch (error) {
      console.log(`❌ Transfer failed: ${error.message}`);
      
      if (error.message.includes("insufficient")) {
        console.log("\n💡 Check ETH balance for gas fees");
      }
    }
    
  } else {
    console.log("📝 DEMO MODE: Showing how Compose would work");
    console.log("============================================\n");
    
    console.log("To execute a real USDe → USDC Compose transfer:");
    console.log("1. Acquire USDe tokens on Base");
    console.log("2. Approve router to spend USDe");
    console.log("3. Call router.transfer() with:");
    console.log("   - fromToken: USDe (Base)");
    console.log("   - toToken: USDC (Arbitrum)");
    console.log("   - Include ~0.002 ETH for LayerZero fee");
    console.log("\nThe system will automatically:");
    console.log("• Bridge USDe from Base to Arbitrum");
    console.log("• Swap USDe for USDC on Arbitrum");
    console.log("• Deliver USDC to recipient");
  }
  
  console.log("\n✅ Test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
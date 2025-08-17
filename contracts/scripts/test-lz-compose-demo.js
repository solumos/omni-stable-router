const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 LAYERZERO COMPOSE DEMO: CROSS-TOKEN TRANSFER");
  console.log("===============================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 8453) {
    throw new Error("Run this on Base mainnet (8453)");
  }
  
  const [user] = await ethers.getSigners();
  
  // Configuration
  const routerAddress = "0xD1e60637cA70C786B857452E50DE8353a01DabBb";
  const usdcBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const wethBase = "0x4200000000000000000000000000000000000006";
  const wethArbitrum = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  
  console.log(`👤 User: ${user.address}`);
  console.log(`🌉 Router: ${routerAddress}\n`);
  
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdcContract = await ethers.getContractAt("IERC20", usdcBase);
  const wethContract = await ethers.getContractAt("IERC20", wethBase);
  
  // Check balances
  const usdcBalance = await usdcContract.balanceOf(user.address);
  const wethBalance = await wethContract.balanceOf(user.address);
  const ethBalance = await ethers.provider.getBalance(user.address);
  
  console.log("💰 Current Balances:");
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
  console.log(`   WETH: ${ethers.formatUnits(wethBalance, 18)}`);
  console.log(`   ETH: ${ethers.formatEther(ethBalance)}\n`);
  
  // Demonstrate LayerZero Compose concept
  console.log("📚 LAYERZERO COMPOSE EXPLAINED");
  console.log("==============================");
  console.log("LayerZero Compose enables cross-token transfers by:");
  console.log("1. Bridging Token A from Chain 1 to Chain 2");
  console.log("2. Automatically swapping Token A for Token B on Chain 2");
  console.log("3. Delivering Token B to the recipient\n");
  
  console.log("Example Routes:");
  console.log("• USDC (Base) → WETH (Arbitrum) - Bridge + Swap");
  console.log("• WETH (Base) → USDC (Arbitrum) - Bridge + Swap");
  console.log("• Any Token → Any Token (with liquidity)\n");
  
  // Check if we have tokens to test with
  const hasUsdc = usdcBalance >= ethers.parseUnits("0.1", 6);
  const hasWeth = wethBalance >= ethers.parseUnits("0.0001", 18);
  
  if (!hasUsdc && !hasWeth) {
    console.log("⚠️  No test tokens available\n");
    
    // Option 1: Wrap some ETH
    if (ethBalance > ethers.parseEther("0.001")) {
      console.log("💡 Wrapping 0.0001 ETH to get WETH for testing...");
      
      const weth = new ethers.Contract(
        wethBase,
        ["function deposit() payable", "function balanceOf(address) view returns (uint256)"],
        user
      );
      
      try {
        const wrapAmount = ethers.parseEther("0.0001");
        const wrapTx = await weth.deposit({ value: wrapAmount });
        await wrapTx.wait();
        console.log("✅ Successfully wrapped ETH to WETH\n");
        
        const newWethBalance = await weth.balanceOf(user.address);
        console.log(`💰 New WETH balance: ${ethers.formatEther(newWethBalance)}\n`);
      } catch (e) {
        console.log(`❌ Failed to wrap ETH: ${e.message}\n`);
        return;
      }
    } else {
      console.log("❌ Insufficient ETH balance for testing");
      return;
    }
  }
  
  // Configure LayerZero Compose route if needed
  console.log("🔧 CONFIGURING LAYERZERO COMPOSE ROUTE");
  console.log("======================================\n");
  
  // For this demo, let's configure WETH (Base) → USDC (Arbitrum)
  const sourceToken = wethBase;
  const destToken = usdcBase; // Different token demonstrates Compose
  const destChain = 42161; // Arbitrum
  
  console.log("📝 Route Configuration:");
  console.log(`   From: WETH on Base`);
  console.log(`   To: USDC on Arbitrum`);
  console.log(`   Process: Bridge WETH → Swap to USDC on Arbitrum\n`);
  
  const isConfigured = await router.isRouteConfigured(
    sourceToken,
    8453,
    destToken,
    destChain
  );
  
  if (!isConfigured) {
    console.log("⚙️  Configuring LayerZero Compose route...");
    
    const route = {
      protocol: 3, // Protocol.LAYERZERO_COMPOSE
      protocolDomain: 30110, // Arbitrum LZ chain ID
      bridgeContract: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7", // LZ endpoint
      poolId: 0,
      swapPool: "0x2626664c2603336E57B271c5C0b26F421741e481", // Uniswap on Arbitrum for swap
      extraData: ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint24"], 
        [500] // 0.05% Uniswap fee for WETH/USDC
      )
    };
    
    try {
      const configTx = await router.configureRoute(
        sourceToken,
        8453,
        destToken,
        destChain,
        route
      );
      await configTx.wait();
      console.log("✅ Route configured successfully\n");
    } catch (e) {
      console.log(`⚠️  Route configuration failed: ${e.message}\n`);
    }
  } else {
    console.log("✅ Route already configured\n");
  }
  
  // Demonstration of how it would work
  console.log("💫 HOW LAYERZERO COMPOSE WORKS");
  console.log("==============================\n");
  
  console.log("When you execute a Compose transfer:");
  console.log("1️⃣  Source chain locks/burns your tokens");
  console.log("2️⃣  LayerZero sends cross-chain message");
  console.log("3️⃣  Destination chain receives message (30-60s)");
  console.log("4️⃣  Tokens are minted/unlocked on destination");
  console.log("5️⃣  Automatic swap executes via DEX");
  console.log("6️⃣  Final tokens delivered to recipient\n");
  
  console.log("📊 COMPARISON WITH OTHER PROTOCOLS");
  console.log("==================================");
  console.log("┌─────────────────┬───────────────┬─────────────┬──────────┐");
  console.log("│ Protocol        │ Speed         │ Capability  │ Gas Cost │");
  console.log("├─────────────────┼───────────────┼─────────────┼──────────┤");
  console.log("│ CCTP v2         │ 8-20 sec      │ USDC only   │ Low      │");
  console.log("│ LayerZero OFT   │ 30-60 sec     │ Same token  │ Medium   │");
  console.log("│ LZ Compose      │ 30-90 sec     │ Any→Any     │ High     │");
  console.log("│ Stargate        │ 30-60 sec     │ Stables     │ Medium   │");
  console.log("└─────────────────┴───────────────┴─────────────┴──────────┘\n");
  
  // Show example execution (without actually executing due to high gas)
  console.log("📝 EXAMPLE EXECUTION CODE");
  console.log("========================");
  console.log("```javascript");
  console.log("// Approve token");
  console.log("await tokenContract.approve(router, amount);");
  console.log("");
  console.log("// Execute Compose transfer");
  console.log("await router.transfer(");
  console.log("  sourceToken,   // e.g., WETH on Base");
  console.log("  destToken,     // e.g., USDC on Arbitrum");
  console.log("  amount,");
  console.log("  destChainId,");
  console.log("  recipient,");
  console.log("  { value: lzFee } // Include LayerZero fee");
  console.log(");");
  console.log("```\n");
  
  console.log("✨ KEY BENEFITS");
  console.log("==============");
  console.log("• No manual swapping needed");
  console.log("• Single transaction for user");
  console.log("• Any token to any token");
  console.log("• Automatic DEX integration");
  console.log("• Composable with other protocols\n");
  
  console.log("⚠️  CONSIDERATIONS");
  console.log("=================");
  console.log("• Higher gas costs (bridge + swap)");
  console.log("• Longer completion time (30-90s)");
  console.log("• Slippage on destination swap");
  console.log("• Requires liquidity on destination\n");
  
  console.log("🎯 USE CASES");
  console.log("===========");
  console.log("• Pay with any token for any service");
  console.log("• Cross-chain arbitrage");
  console.log("• Portfolio rebalancing");
  console.log("• DeFi composability\n");
  
  console.log("✅ DEMO COMPLETE!");
  console.log("================");
  console.log("LayerZero Compose enables powerful cross-chain, cross-token");
  console.log("transfers with automatic swapping on the destination chain.");
  console.log("\nTo test with real transfers, ensure you have:");
  console.log("• Sufficient tokens (WETH, USDC, etc.)");
  console.log("• ETH for LayerZero fees (~0.001-0.01 ETH)");
  console.log("• Patience for 30-90 second completion");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
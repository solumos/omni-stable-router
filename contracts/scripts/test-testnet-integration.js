const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Testnet Integration...\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  let config;
  if (chainId === 84532) {
    config = {
      name: "Base Sepolia",
      router: "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be",
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      otherChain: 421614,
      otherUsdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
    };
  } else if (chainId === 421614) {
    config = {
      name: "Arbitrum Sepolia", 
      router: "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B",
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      otherChain: 84532,
      otherUsdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    };
  } else {
    throw new Error(`Unsupported network: ${chainId}`);
  }
  
  console.log(`📍 Testing on ${config.name} (${chainId})`);
  console.log(`Router: ${config.router}`);
  console.log(`USDC: ${config.usdc}\n`);
  
  const [signer] = await ethers.getSigners();
  console.log("Tester:", signer.address);
  console.log("ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)));
  
  // Get contracts
  const router = await ethers.getContractAt("UnifiedRouter", config.router);
  const usdc = await ethers.getContractAt("IERC20", config.usdc);
  
  console.log("\n1️⃣ Testing Contract Connectivity...");
  
  try {
    const owner = await router.owner();
    const paused = await router.paused();
    console.log("✅ Router owner:", owner);
    console.log("✅ Router paused:", paused);
  } catch (e) {
    console.log("❌ Failed to connect to router:", e.message);
    return;
  }
  
  console.log("\n2️⃣ Testing Protocol Configuration...");
  
  try {
    const cctpContract = await router.protocolContracts(1); // CCTP = 1
    const lzContract = await router.protocolContracts(3);   // LayerZero = 3
    console.log("✅ CCTP configured:", cctpContract !== ethers.ZeroAddress);
    console.log("✅ LayerZero configured:", lzContract !== ethers.ZeroAddress);
    console.log("   CCTP Address:", cctpContract);
    console.log("   LayerZero Address:", lzContract);
  } catch (e) {
    console.log("❌ Failed to check protocols:", e.message);
  }
  
  console.log("\n3️⃣ Testing Route Configuration...");
  
  try {
    const sameChainRoute = await router.isRouteConfigured(
      config.usdc, chainId, config.usdc, chainId
    );
    const crossChainRoute = await router.isRouteConfigured(
      config.usdc, chainId, config.otherUsdc, config.otherChain
    );
    
    console.log("✅ Same-chain route:", sameChainRoute);
    console.log("✅ Cross-chain route:", crossChainRoute);
  } catch (e) {
    console.log("❌ Failed to check routes:", e.message);
  }
  
  console.log("\n4️⃣ Testing USDC Token...");
  
  try {
    const balance = await usdc.balanceOf(signer.address);
    const symbol = await usdc.symbol();
    const decimals = await usdc.decimals();
    
    console.log(`✅ Token: ${symbol} (${decimals} decimals)`);
    console.log(`✅ Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    
    if (balance === BigInt(0)) {
      console.log("⚠️  No USDC balance! Get testnet USDC from https://faucet.circle.com/");
    }
  } catch (e) {
    console.log("❌ Failed to check USDC:", e.message);
  }
  
  console.log("\n5️⃣ Testing Fee Estimation...");
  
  try {
    const testAmount = ethers.parseUnits("1", 6); // 1 USDC
    const fee = await router.estimateFees(
      config.usdc,
      config.otherUsdc,
      testAmount,
      config.otherChain,
      signer.address
    );
    console.log("✅ Cross-chain fee estimate:", ethers.formatEther(fee), "ETH");
  } catch (e) {
    console.log("❌ Failed to estimate fees:", e.message);
  }
  
  console.log("\n6️⃣ Testing Transfer Simulation (if USDC available)...");
  
  try {
    const balance = await usdc.balanceOf(signer.address);
    if (balance > 0) {
      const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC test
      
      // Check if amount is small enough
      if (balance >= testAmount) {
        // First check allowance
        const allowance = await usdc.allowance(signer.address, config.router);
        
        if (allowance < testAmount) {
          console.log("   Approving USDC...");
          const approveTx = await usdc.approve(config.router, testAmount);
          await approveTx.wait();
          console.log("   ✅ USDC approved");
        }
        
        // Simulate the transfer
        try {
          await router.transfer.staticCall(
            config.usdc,
            config.otherUsdc,
            testAmount,
            config.otherChain,
            signer.address
          );
          console.log("✅ Transfer simulation successful!");
          console.log("   Ready for real cross-chain transfer");
        } catch (simError) {
          console.log("❌ Transfer simulation failed:", simError.message);
        }
      } else {
        console.log("⚠️  Balance too low for test transfer");
      }
    } else {
      console.log("⚠️  No USDC to test with - get some from faucet");
    }
  } catch (e) {
    console.log("❌ Transfer test failed:", e.message);
  }
  
  console.log("\n========================================");
  console.log("🎯 Test Summary");
  console.log("========================================");
  console.log(`Network: ${config.name}`);
  console.log(`Router: ${config.router}`);
  console.log("Status: Ready for testing!");
  console.log("\n💡 Next steps:");
  console.log("1. Get testnet USDC from https://faucet.circle.com/");
  console.log("2. Try cross-chain transfer via frontend");
  console.log("3. Monitor transaction on block explorer");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
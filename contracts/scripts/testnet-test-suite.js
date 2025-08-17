const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 COMPREHENSIVE TESTNET TEST SUITE");
  console.log("=====================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  let config;
  if (chainId === 84532) {
    config = {
      name: "Base Sepolia",
      router: "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be",
      swapExecutor: "0xf44dA2A1f3b1aA0Fd79807E13b21d67A0eCE9DdE",
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      targetChain: 421614,
      targetUsdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      targetName: "Arbitrum Sepolia",
      explorer: "https://sepolia.basescan.org"
    };
  } else if (chainId === 421614) {
    config = {
      name: "Arbitrum Sepolia",
      router: "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B",
      swapExecutor: "0x77CbBF036d9403b36F19C6A0A9Afffa45cA40950",
      usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      targetChain: 84532,
      targetUsdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      targetName: "Base Sepolia",
      explorer: "https://sepolia.arbiscan.io"
    };
  } else {
    throw new Error("Please run on Base Sepolia (84532) or Arbitrum Sepolia (421614)");
  }
  
  console.log(`🎯 Testing on ${config.name} (Chain ID: ${chainId})`);
  console.log(`🔗 Explorer: ${config.explorer}\n`);
  
  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", config.router);
  const usdc = await ethers.getContractAt([
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address, address) view returns (uint256)",
    "function approve(address, uint256) returns (bool)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)"
  ], config.usdc);
  
  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function logTest(name, success, details = "") {
    const status = success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${name}`);
    if (details) console.log(`   ${details}`);
    
    testResults.tests.push({ name, success, details });
    if (success) testResults.passed++;
    else testResults.failed++;
  }
  
  console.log("👤 Test Account:", signer.address);
  console.log("💰 ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)));
  console.log("");
  
  // TEST 1: Contract Deployment Verification
  console.log("🔍 TEST 1: Contract Deployment Verification");
  console.log("─".repeat(50));
  
  try {
    const owner = await router.owner();
    const paused = await router.paused();
    logTest("Router contract accessible", true, `Owner: ${owner}, Paused: ${paused}`);
  } catch (e) {
    logTest("Router contract accessible", false, e.message);
  }
  
  try {
    const symbol = await usdc.symbol();
    const decimals = await usdc.decimals();
    logTest("USDC contract accessible", true, `Symbol: ${symbol}, Decimals: ${decimals}`);
  } catch (e) {
    logTest("USDC contract accessible", false, e.message);
  }
  
  // TEST 2: Protocol Configuration
  console.log("\n🔧 TEST 2: Protocol Configuration");
  console.log("─".repeat(50));
  
  try {
    const cctpContract = await router.protocolContracts(1); // CCTP
    const isConfigured = cctpContract !== ethers.ZeroAddress;
    logTest("CCTP protocol configured", isConfigured, `Address: ${cctpContract}`);
  } catch (e) {
    logTest("CCTP protocol configured", false, e.message);
  }
  
  try {
    const lzContract = await router.protocolContracts(3); // LayerZero
    const isConfigured = lzContract !== ethers.ZeroAddress;
    logTest("LayerZero protocol configured", isConfigured, `Address: ${lzContract}`);
  } catch (e) {
    logTest("LayerZero protocol configured", false, e.message);
  }
  
  // TEST 3: Route Configuration
  console.log("\n🛣️  TEST 3: Route Configuration");
  console.log("─".repeat(50));
  
  try {
    const sameChainRoute = await router.isRouteConfigured(
      config.usdc, chainId, config.usdc, chainId
    );
    logTest("Same-chain route configured", sameChainRoute);
  } catch (e) {
    logTest("Same-chain route configured", false, e.message);
  }
  
  try {
    const crossChainRoute = await router.isRouteConfigured(
      config.usdc, chainId, config.targetUsdc, config.targetChain
    );
    logTest("Cross-chain route configured", crossChainRoute);
  } catch (e) {
    logTest("Cross-chain route configured", false, e.message);
  }
  
  // TEST 4: Fee Estimation
  console.log("\n💰 TEST 4: Fee Estimation");
  console.log("─".repeat(50));
  
  try {
    const testAmount = ethers.parseUnits("1", 6); // 1 USDC
    const fee = await router.estimateFees(
      config.usdc,
      config.targetUsdc,
      testAmount,
      config.targetChain,
      signer.address
    );
    logTest("Cross-chain fee estimation", true, `Fee: ${ethers.formatEther(fee)} ETH`);
  } catch (e) {
    logTest("Cross-chain fee estimation", false, e.message);
  }
  
  try {
    const sameChainFee = await router.estimateFees(
      config.usdc,
      config.usdc,
      ethers.parseUnits("1", 6),
      chainId,
      signer.address
    );
    logTest("Same-chain fee estimation", true, `Fee: ${ethers.formatEther(sameChainFee)} ETH`);
  } catch (e) {
    logTest("Same-chain fee estimation", false, e.message);
  }
  
  // TEST 5: Token Balance & Allowance
  console.log("\n🪙 TEST 5: Token Balance & Allowance");
  console.log("─".repeat(50));
  
  let userBalance = BigInt(0);
  try {
    userBalance = await usdc.balanceOf(signer.address);
    const formatted = ethers.formatUnits(userBalance, 6);
    logTest("USDC balance check", true, `Balance: ${formatted} USDC`);
  } catch (e) {
    logTest("USDC balance check", false, e.message);
  }
  
  try {
    const allowance = await usdc.allowance(signer.address, config.router);
    const formatted = ethers.formatUnits(allowance, 6);
    logTest("Router allowance check", true, `Allowance: ${formatted} USDC`);
  } catch (e) {
    logTest("Router allowance check", false, e.message);
  }
  
  // TEST 6: Transfer Simulation (if USDC available)
  console.log("\n🔄 TEST 6: Transfer Simulation");
  console.log("─".repeat(50));
  
  if (userBalance > 0) {
    const testAmount = ethers.parseUnits("0.01", 6); // 0.01 USDC
    
    if (userBalance >= testAmount) {
      // Test approval
      try {
        const currentAllowance = await usdc.allowance(signer.address, config.router);
        if (currentAllowance < testAmount) {
          const approveTx = await usdc.approve(config.router, testAmount);
          await approveTx.wait();
          logTest("USDC approval", true, `Approved ${ethers.formatUnits(testAmount, 6)} USDC`);
        } else {
          logTest("USDC approval", true, "Sufficient allowance already exists");
        }
      } catch (e) {
        logTest("USDC approval", false, e.message);
      }
      
      // Test transfer simulation
      try {
        await router.transfer.staticCall(
          config.usdc,
          config.targetUsdc,
          testAmount,
          config.targetChain,
          signer.address
        );
        logTest("Cross-chain transfer simulation", true, "Transfer call simulation successful");
      } catch (e) {
        logTest("Cross-chain transfer simulation", false, e.message);
      }
      
      // Test same-chain transfer simulation
      try {
        await router.transfer.staticCall(
          config.usdc,
          config.usdc,
          testAmount,
          chainId,
          signer.address
        );
        logTest("Same-chain transfer simulation", true, "Same-chain transfer simulation successful");
      } catch (e) {
        logTest("Same-chain transfer simulation", false, e.message);
      }
    } else {
      logTest("Transfer tests", false, `Insufficient balance (need 0.01 USDC, have ${ethers.formatUnits(userBalance, 6)})`);
    }
  } else {
    logTest("Transfer tests", false, "No USDC balance - get testnet USDC from https://faucet.circle.com/");
  }
  
  // TEST 7: Gas Estimation
  console.log("\n⛽ TEST 7: Gas Estimation");
  console.log("─".repeat(50));
  
  if (userBalance > ethers.parseUnits("0.01", 6)) {
    try {
      const gasEstimate = await router.transfer.estimateGas(
        config.usdc,
        config.targetUsdc,
        ethers.parseUnits("0.01", 6),
        config.targetChain,
        signer.address
      );
      logTest("Cross-chain gas estimation", true, `Estimated gas: ${gasEstimate.toString()}`);
    } catch (e) {
      logTest("Cross-chain gas estimation", false, e.message);
    }
  } else {
    logTest("Cross-chain gas estimation", false, "Skipped - insufficient USDC balance");
  }
  
  // TEST 8: Contract State Verification
  console.log("\n🔍 TEST 8: Contract State Verification");
  console.log("─".repeat(50));
  
  try {
    const paused = await router.paused();
    logTest("Router not paused", !paused, `Paused state: ${paused}`);
  } catch (e) {
    logTest("Router not paused", false, e.message);
  }
  
  try {
    const owner = await router.owner();
    const isOwnerSet = owner !== ethers.ZeroAddress;
    logTest("Router has owner", isOwnerSet, `Owner: ${owner}`);
  } catch (e) {
    logTest("Router has owner", false, e.message);
  }
  
  // FINAL RESULTS
  console.log("\n" + "=".repeat(60));
  console.log("🏁 TEST SUITE RESULTS");
  console.log("=".repeat(60));
  console.log(`📊 Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! System is ready for production testing!");
  } else {
    console.log("\n⚠️  Some tests failed. Review the results above.");
  }
  
  console.log("\n📋 Quick Start for Users:");
  console.log("1. Get testnet ETH for gas fees");
  console.log("2. Get testnet USDC: https://faucet.circle.com/");
  console.log("3. Connect to frontend and test transfers");
  console.log(`4. Monitor transactions: ${config.explorer}`);
  
  console.log(`\n🔗 Contract Addresses:`);
  console.log(`   Router: ${config.router}`);
  console.log(`   USDC: ${config.usdc}`);
  console.log(`   Explorer: ${config.explorer}/address/${config.router}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
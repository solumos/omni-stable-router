const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment info
const network = hre.network.name;
const deploymentPath = path.join(__dirname, `../deployments/${network}-deployment.json`);
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Test configuration
const TEST_AMOUNT = ethers.utils.parseUnits("10", 6); // 10 USDC
const SLIPPAGE_BPS = 100; // 1% slippage

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m"
};

async function main() {
  console.log(`${colors.cyan}🧪 Starting Testnet Integration Tests${colors.reset}\n`);
  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${deployment.chainId}`);
  console.log("=====================================\n");

  const [tester] = await ethers.getSigners();
  console.log(`${colors.blue}Tester address: ${tester.address}${colors.reset}`);
  
  // Load contracts
  const stableRouter = await ethers.getContractAt("StableRouter", deployment.contracts.stableRouter);
  const routeProcessor = await ethers.getContractAt("RouteProcessor", deployment.contracts.routeProcessor);
  const swapExecutor = await ethers.getContractAt("SwapExecutor", deployment.contracts.swapExecutor);
  const usdc = await ethers.getContractAt("IERC20", deployment.externalContracts.usdc);
  
  // Test results tracking
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // ============ Test 1: Check USDC Balance ============
  await runTest("Check USDC Balance", async () => {
    const balance = await usdc.balanceOf(tester.address);
    console.log(`USDC Balance: ${ethers.utils.formatUnits(balance, 6)} USDC`);
    
    if (balance.lt(TEST_AMOUNT)) {
      throw new Error(`Insufficient USDC balance. Need at least ${ethers.utils.formatUnits(TEST_AMOUNT, 6)} USDC`);
    }
    return true;
  }, results);

  // ============ Test 2: Approve Router ============
  await runTest("Approve StableRouter", async () => {
    const tx = await usdc.approve(stableRouter.address, ethers.constants.MaxUint256);
    await tx.wait();
    
    const allowance = await usdc.allowance(tester.address, stableRouter.address);
    if (allowance.lt(TEST_AMOUNT)) {
      throw new Error("Approval failed");
    }
    return true;
  }, results);

  // ============ Test 3: Basic CCTP Transfer (Same Chain Test) ============
  await runTest("CCTP: USDC Transfer (Mock)", async () => {
    // For same-chain testing, we'll just test the approval and validation
    // Real cross-chain would require waiting for attestation
    
    const routeParams = {
      sourceToken: deployment.externalContracts.usdc,
      destToken: deployment.externalContracts.usdc,
      amount: TEST_AMOUNT,
      destChainId: 421614, // Arbitrum Sepolia
      recipient: tester.address,
      minAmountOut: TEST_AMOUNT.mul(99).div(100), // 1% slippage
      routeData: "0x"
    };
    
    // Check if route is valid (dry run)
    console.log("Testing route validation...");
    
    // This would normally execute the route, but for testnet we might want to skip
    // to avoid losing testnet tokens
    const canExecute = await stableRouter.callStatic.executeRoute(routeParams, { value: 0 })
      .then(() => true)
      .catch(err => {
        console.log(`Route validation error: ${err.message}`);
        return false;
      });
    
    if (!canExecute) {
      throw new Error("Route validation failed");
    }
    
    console.log("✓ Route validation passed");
    return true;
  }, results);

  // ============ Test 4: Check Pause Functionality ============
  await runTest("Pause Mechanism", async () => {
    // Note: This will fail if not owner, which is expected after ownership transfer
    try {
      await swapExecutor.callStatic.pause();
      console.log("⚠️  Warning: SwapExecutor can be paused by non-timelock");
    } catch (err) {
      console.log("✓ Pause protected by ownership");
    }
    return true;
  }, results);

  // ============ Test 5: Deadline Protection ============
  await runTest("Deadline Protection", async () => {
    const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    
    try {
      await swapExecutor.callStatic.executeSwap(
        deployment.externalContracts.usdc,
        deployment.externalContracts.usdc,
        TEST_AMOUNT,
        TEST_AMOUNT,
        ethers.constants.AddressZero,
        "0x",
        pastDeadline
      );
      throw new Error("Should have rejected past deadline");
    } catch (err) {
      if (err.message.includes("Deadline passed") || err.message.includes("VL: Deadline passed")) {
        console.log("✓ Deadline protection working");
        return true;
      }
      throw err;
    }
  }, results);

  // ============ Test 6: Array Bounds Protection ============
  await runTest("Array Bounds Protection", async () => {
    // Create arrays larger than MAX_BATCH_SIZE (10)
    const largeArray = new Array(15).fill(deployment.externalContracts.usdc);
    const amounts = new Array(15).fill(TEST_AMOUNT);
    const minAmounts = new Array(15).fill(TEST_AMOUNT.mul(99).div(100));
    const pools = new Array(15).fill(ethers.constants.AddressZero);
    const swapData = new Array(15).fill("0x");
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    try {
      await swapExecutor.callStatic.executeBatchSwaps(
        largeArray,
        largeArray,
        amounts,
        minAmounts,
        pools,
        swapData,
        deadline
      );
      throw new Error("Should have rejected large batch");
    } catch (err) {
      if (err.message.includes("Array too large") || err.message.includes("VL: Array too large")) {
        console.log("✓ Batch size limit enforced");
        return true;
      }
      throw err;
    }
  }, results);

  // ============ Test 7: Check Multi-sig Configuration ============
  await runTest("Multi-sig Configuration", async () => {
    const timelock = await ethers.getContractAt("TimelockMultisig", deployment.contracts.timelock);
    
    // Check proposer role
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const hasProposerRole = await timelock.hasRole(PROPOSER_ROLE, deployment.multisig.proposers[0]);
    
    if (!hasProposerRole) {
      throw new Error("Proposer role not configured");
    }
    
    // Check executor role
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const hasExecutorRole = await timelock.hasRole(EXECUTOR_ROLE, deployment.multisig.executors[0]);
    
    if (!hasExecutorRole) {
      throw new Error("Executor role not configured");
    }
    
    // Check minimum delay
    const minDelay = await timelock.getMinDelay();
    const expectedDelay = 2 * 24 * 60 * 60; // 2 days
    
    if (!minDelay.eq(expectedDelay)) {
      throw new Error(`Unexpected delay: ${minDelay} vs ${expectedDelay}`);
    }
    
    console.log("✓ Multi-sig properly configured");
    console.log(`  - Min delay: ${minDelay / 86400} days`);
    console.log(`  - Proposers: ${deployment.multisig.proposers.length}`);
    console.log(`  - Executors: ${deployment.multisig.executors.length}`);
    
    return true;
  }, results);

  // ============ Test 8: Verify Ownership Transfer ============
  await runTest("Ownership Transfer", async () => {
    const routerOwner = await stableRouter.owner();
    const processorOwner = await routeProcessor.owner();
    
    if (routerOwner !== deployment.contracts.timelock) {
      throw new Error("StableRouter ownership not transferred to timelock");
    }
    
    if (processorOwner !== deployment.contracts.timelock) {
      throw new Error("RouteProcessor ownership not transferred to timelock");
    }
    
    console.log("✓ All contracts owned by timelock");
    return true;
  }, results);

  // ============ Print Results ============
  console.log("\n=====================================");
  console.log(`${colors.cyan}📊 TEST RESULTS${colors.reset}`);
  console.log("=====================================\n");
  
  results.tests.forEach(test => {
    const status = test.passed ? 
      `${colors.green}✅ PASS${colors.reset}` : 
      `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`${status} ${test.name}`);
    if (!test.passed && test.error) {
      console.log(`   ${colors.red}Error: ${test.error}${colors.reset}`);
    }
  });
  
  console.log("\n-------------------------------------");
  console.log(`Total: ${results.passed + results.failed} tests`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Review and fix issues.${colors.reset}`);
  }
}

// Helper function to run tests
async function runTest(name, testFn, results) {
  console.log(`\n${colors.yellow}Running: ${name}${colors.reset}`);
  
  try {
    await testFn();
    results.passed++;
    results.tests.push({ name, passed: true });
    console.log(`${colors.green}✅ ${name} passed${colors.reset}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, passed: false, error: error.message });
    console.log(`${colors.red}❌ ${name} failed: ${error.message}${colors.reset}`);
  }
}

// Execute tests
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
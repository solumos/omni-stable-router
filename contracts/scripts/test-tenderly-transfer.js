const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");
const fs = require("fs");

// Mainnet token addresses
const TOKENS = {
  ethereum: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
  arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  }
};

// Chain IDs
const CHAIN_IDS = {
  tenderlyMainnet: 9923,
  tenderlyBase: 84539,
  tenderlyArbitrum: 9924
};

// Known whale addresses for each chain
const WHALES = {
  ethereum: {
    USDC: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503", // Binance
  },
  base: {
    USDC: "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A", // Large holder
  },
  arbitrum: {
    USDC: "0x489ee077994B6658eAfA855C308275EAd8097C4A", // Large holder
  }
};

function getChainName(network) {
  if (network === "tenderlyMainnet") return "ethereum";
  if (network === "tenderlyBase") return "base";
  if (network === "tenderlyArbitrum") return "arbitrum";
  throw new Error(`Unknown network: ${network}`);
}

async function fundWithTokens(tokenAddress, amount, whaleAddress) {
  const [signer] = await ethers.getSigners();
  
  console.log(`\n💰 Funding account with tokens...`);
  console.log(`  Whale: ${whaleAddress}`);
  
  try {
    // Fund whale with ETH
    await ethers.provider.send("tenderly_setBalance", [
      [whaleAddress],
      ethers.toQuantity(ethers.parseEther("100"))
    ]);
    
    // Impersonate whale
    await ethers.provider.send("hardhat_impersonateAccount", [whaleAddress]);
    const whale = await ethers.getSigner(whaleAddress);
    
    // Transfer tokens
    const token = await ethers.getContractAt("IERC20", tokenAddress);
    const tokenAsWhale = token.connect(whale);
    
    const tx = await tokenAsWhale.transfer(signer.address, amount);
    await tx.wait();
    
    console.log(`  ✅ Received ${formatUnits(amount, 6)} tokens`);
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [whaleAddress]);
    
    return true;
  } catch (error) {
    console.log(`  ❌ Failed to fund: ${error.message}`);
    return false;
  }
}

async function testCrossChainTransfer(destNetwork, fromToken = "USDC", toToken = "USDC") {
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();
  
  console.log("\n🚀 Cross-Chain Transfer Test");
  console.log("=====================================");
  console.log(`From: ${network} (${getChainName(network)})`);
  console.log(`To: ${destNetwork} (${getChainName(destNetwork)})`);
  console.log(`Transfer: ${fromToken} → ${toToken}`);
  console.log(`Account: ${signer.address}`);
  
  // Load router deployment
  const sourceChain = getChainName(network);
  const destChain = getChainName(destNetwork);
  
  const deploymentPath = `./deployments/tenderly-${sourceChain}.json`;
  if (!fs.existsSync(deploymentPath)) {
    console.log("❌ No deployment found. Run tenderly-deploy.js first.");
    return;
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const routerAddress = deployment.contracts.UnifiedRouter;
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  console.log(`Router: ${routerAddress}`);
  
  // Get token addresses
  const fromTokenAddress = TOKENS[sourceChain][fromToken];
  const toTokenAddress = TOKENS[destChain][toToken];
  
  if (!fromTokenAddress || !toTokenAddress) {
    console.log(`❌ Token not found: ${fromToken} on ${sourceChain} or ${toToken} on ${destChain}`);
    return;
  }
  
  console.log(`\n📝 Token Addresses:`);
  console.log(`  From: ${fromTokenAddress} (${fromToken})`);
  console.log(`  To: ${toTokenAddress} (${toToken})`);
  
  // Check token balance
  const tokenContract = await ethers.getContractAt("IERC20", fromTokenAddress);
  let balance = await tokenContract.balanceOf(signer.address);
  console.log(`\n💰 Current ${fromToken} balance: ${formatUnits(balance, 6)}`);
  
  // Fund if needed
  if (balance < parseUnits("10", 6)) {
    const whaleAddress = WHALES[sourceChain][fromToken];
    if (whaleAddress) {
      await fundWithTokens(fromTokenAddress, parseUnits("100", 6), whaleAddress);
      balance = await tokenContract.balanceOf(signer.address);
    } else {
      console.log("❌ No whale address configured for funding");
      return;
    }
  }
  
  // Amount to transfer
  const amount = parseUnits("10", 6); // 10 USDC
  
  // Check route configuration
  console.log("\n🔍 Checking route configuration...");
  const isConfigured = await router.isRouteConfigured(
    fromTokenAddress,
    CHAIN_IDS[network],
    toTokenAddress,
    CHAIN_IDS[destNetwork]
  );
  
  if (!isConfigured) {
    console.log("❌ Route not configured!");
    console.log("Run configure-tenderly-routes.js first");
    return;
  }
  console.log("✅ Route is configured");
  
  // Get route details
  const routeKey = await router.getRouteKey(
    fromTokenAddress,
    CHAIN_IDS[network],
    toTokenAddress,
    CHAIN_IDS[destNetwork]
  );
  const route = await router.routes(routeKey);
  
  const protocolNames = ["NONE", "CCTP", "CCTP_HOOKS", "LAYERZERO", "STARGATE"];
  console.log(`🌉 Protocol: ${protocolNames[route.protocol]}`);
  console.log(`🎯 Domain: ${route.protocolDomain}`);
  
  // Approve router
  console.log("\n1️⃣  Approving router...");
  const allowance = await tokenContract.allowance(signer.address, deployment.contracts.UnifiedRouter);
  if (allowance < amount) {
    const approveTx = await tokenContract.approve(deployment.contracts.UnifiedRouter, amount);
    await approveTx.wait();
    console.log("✅ Approved");
  } else {
    console.log("✅ Already approved");
  }
  
  // Execute transfer
  console.log("\n2️⃣  Executing cross-chain transfer...");
  console.log(`  Amount: ${formatUnits(amount, 6)} ${fromToken}`);
  console.log(`  Recipient: ${signer.address}`);
  console.log(`  Destination: ${destChain}`);
  
  try {
    // Skip gas estimation due to ReentrancyGuard issue with static calls
    // Just use a reasonable gas limit
    const tx = await router.transfer(
      fromTokenAddress,    // fromToken
      toTokenAddress,      // toToken
      amount,              // amount
      CHAIN_IDS[destNetwork], // toChainId
      signer.address,      // recipient
      { value: 0, gasLimit: 500000 }  // Fixed gas limit
    );
    
    console.log(`\n📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transfer initiated!");
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Parse events
    console.log("\n📋 Events:");
    for (const log of receipt.logs) {
      try {
        const parsed = router.interface.parseLog(log);
        if (parsed) {
          if (parsed.name === "TransferInitiated") {
            console.log("\nTransferInitiated:");
            console.log(`  Transfer ID: ${parsed.args.transferId}`);
            console.log(`  Protocol: ${protocolNames[parsed.args.protocol]}`);
            console.log(`  Amount: ${formatUnits(parsed.args.amount, 6)} ${fromToken}`);
          } else if (parsed.name === "SameChainSwapExecuted") {
            console.log("\nSameChainSwapExecuted:");
            console.log(`  Transfer ID: ${parsed.args.transferId}`);
            console.log(`  Amount Out: ${formatUnits(parsed.args.amountOut, 18)}`);
          }
        }
      } catch (e) {
        // Other contract events
      }
    }
    
    // Check balance after
    const newBalance = await tokenContract.balanceOf(signer.address);
    console.log(`\n💰 New ${fromToken} balance: ${formatUnits(newBalance, 6)}`);
    console.log(`   Sent: ${formatUnits(balance - newBalance, 6)} ${fromToken}`);
    
    console.log("\n========================================");
    console.log("✅ SUCCESS!");
    console.log("========================================");
    
    if (protocolNames[route.protocol] === "CCTP" || protocolNames[route.protocol] === "CCTP_HOOKS") {
      console.log("\n⏱️  CCTP transfers take ~15 minutes to complete");
      console.log("On Tenderly, you can advance time to speed this up");
    } else if (protocolNames[route.protocol] === "LAYERZERO") {
      console.log("\n⏱️  LayerZero transfers are usually instant");
    }
    
    console.log("\n📍 Next steps:");
    console.log(`1. Switch to ${destNetwork}`);
    console.log(`2. Check ${toToken} balance on destination`);
    console.log(`3. Use Tenderly dashboard to trace the transaction`);
    
  } catch (error) {
    console.error("\n❌ Transfer failed:", error.message);
    console.log("\nTroubleshooting:");
    console.log("1. Check token balance");
    console.log("2. Verify route configuration"); 
    console.log("3. Check Tenderly dashboard for detailed error");
  }
}

async function main() {
  // For now, hardcode the destination network for testing
  // In a real scenario, you'd parse command line args differently
  const destNetwork = process.env.DEST_NETWORK || "tenderlyArbitrum";
  const fromToken = process.env.FROM_TOKEN || "USDC";
  const toToken = process.env.TO_TOKEN || fromToken;
  
  await testCrossChainTransfer(destNetwork, fromToken, toToken);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
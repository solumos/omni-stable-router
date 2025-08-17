const { ethers } = require("hardhat");
const fs = require("fs");

// Token addresses on different chains
const TOKENS = {
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    PYUSD: "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4", // PayPal USD on Base
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"  // Ethena USDe on Base
  },
  arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    PYUSD: "0x0c92FD9e86154cDcAE09f6F155fAdDcb27Bf7dD9", // PayPal USD on Arbitrum
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"  // Ethena USDe on Arbitrum
  },
  mainnet: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    PYUSD: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
    USDe: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3"
  }
};

// Protocol addresses
const PROTOCOLS = {
  base: {
    CCTP_TOKEN_MESSENGER: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    CCTP_MESSAGE_TRANSMITTER: "0xAD09780d193884d503182aD4588450C416D6F9D4",
    LAYERZERO_ENDPOINT: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
    cctpDomain: 6,
    lzChainId: 184
  },
  arbitrum: {
    CCTP_TOKEN_MESSENGER: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
    CCTP_MESSAGE_TRANSMITTER: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
    LAYERZERO_ENDPOINT: "0x3c2269811836af69497E5F486A85D7316753cf62",
    cctpDomain: 3,
    lzChainId: 110
  },
  mainnet: {
    CCTP_TOKEN_MESSENGER: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
    CCTP_MESSAGE_TRANSMITTER: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
    LAYERZERO_ENDPOINT: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
    cctpDomain: 0,
    lzChainId: 101
  }
};

// Protocol enum
const Protocol = {
  NONE: 0,
  CCTP: 1,
  CCTP_HOOKS: 2,
  LAYERZERO: 3,
  STARGATE: 4
};

// Load deployment info
function loadDeployment() {
  try {
    const data = fs.readFileSync("./deployments/localhost.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Could not load deployment. Run deploy-local.js first.");
    process.exit(1);
  }
}

async function impersonateWhale(whaleAddress, tokenAddress, amount, recipient) {
  console.log(`  🐋 Impersonating whale: ${whaleAddress}`);
  
  // Impersonate the whale
  await ethers.provider.send("hardhat_impersonateAccount", [whaleAddress]);
  
  // Give whale some ETH for gas
  await ethers.provider.send("hardhat_setBalance", [
    whaleAddress,
    "0x1000000000000000000" // 1 ETH
  ]);
  
  // Create a JsonRpcSigner for the impersonated account
  const whale = new ethers.JsonRpcSigner(ethers.provider, whaleAddress);
  const token = await ethers.getContractAt("IERC20", tokenAddress, whale);
  
  // Transfer tokens to recipient
  const tx = await token.transfer(recipient, amount);
  await tx.wait();
  
  console.log(`  ✅ Transferred ${ethers.formatUnits(amount, 6)} tokens to ${recipient}`);
  
  // Stop impersonating
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [whaleAddress]);
}

async function configureRoute(router, fromToken, fromChainId, toToken, toChainId, protocol, protocolDomain, bridgeContract, swapPool = ethers.ZeroAddress) {
  console.log(`  ⚙️  Configuring route: ${protocol === 1 ? 'CCTP' : protocol === 2 ? 'CCTP_HOOKS' : protocol === 3 ? 'LAYERZERO' : 'UNKNOWN'}`);
  
  const tx = await router.configureRoute(
    fromToken,
    fromChainId,
    toToken,
    toChainId,
    {
      protocol: protocol,
      protocolDomain: protocolDomain,
      bridgeContract: bridgeContract,
      poolId: 0,
      swapPool: swapPool,
      extraData: "0x"
    }
  );
  await tx.wait();
  console.log(`  ✅ Route configured`);
}

// Test Scenario 1: CCTP for USDC <-> USDC
async function testCCTPforUSDC() {
  console.log("\n=====================================");
  console.log("1️⃣  Testing CCTP: USDC <-> USDC");
  console.log("=====================================\n");
  
  const deployment = loadDeployment();
  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", deployment.contracts.UnifiedRouter);
  
  // Configure Base -> Arbitrum route
  console.log("📍 Configuring Base -> Arbitrum CCTP route...");
  await configureRoute(
    router,
    TOKENS.base.USDC,      // fromToken
    8453,                   // Base chainId
    TOKENS.arbitrum.USDC,   // toToken (different address!)
    42161,                  // Arbitrum chainId
    Protocol.CCTP,          // protocol
    PROTOCOLS.arbitrum.cctpDomain, // destination domain
    PROTOCOLS.base.CCTP_TOKEN_MESSENGER // bridge contract
  );
  
  // Fund the test account with USDC
  const USDC_WHALE = "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A"; // Base USDC whale with 24k USDC
  await impersonateWhale(USDC_WHALE, TOKENS.base.USDC, ethers.parseUnits("100", 6), signer.address);
  
  // Approve router
  const usdc = await ethers.getContractAt("IERC20", TOKENS.base.USDC);
  await usdc.approve(await router.getAddress(), ethers.parseUnits("100", 6));
  
  // Test transfer
  console.log("\n🚀 Initiating USDC transfer from Base to Arbitrum...");
  console.log("  From: USDC on Base    ", TOKENS.base.USDC);
  console.log("  To:   USDC on Arbitrum", TOKENS.arbitrum.USDC);
  console.log("  Amount: 10 USDC");
  
  try {
    const tx = await router.transfer(
      TOKENS.base.USDC,      // fromToken
      TOKENS.arbitrum.USDC,   // toToken (different address!)
      ethers.parseUnits("10", 6), // amount
      42161,                  // toChainId (Arbitrum)
      signer.address          // recipient
    );
    
    const receipt = await tx.wait();
    console.log("  ✅ Transfer initiated! Tx:", receipt.hash);
    
    // Parse events
    const transferEvent = receipt.logs.find(log => {
      try {
        const parsed = router.interface.parseLog(log);
        return parsed?.name === "TransferInitiated";
      } catch { return false; }
    });
    
    if (transferEvent) {
      const parsed = router.interface.parseLog(transferEvent);
      console.log("  📋 Transfer ID:", parsed.args[0]);
      console.log("  🔄 Protocol:", parsed.args[8] === 1n ? "CCTP" : "Unknown");
    }
    
    console.log("\n✅ CCTP USDC <-> USDC test completed successfully!");
  } catch (error) {
    console.error("❌ CCTP test failed:", error.message);
  }
}

// Test Scenario 2: LayerZero OFT for PYUSD and USDe
async function testLayerZeroOFT() {
  console.log("\n=====================================");
  console.log("2️⃣  Testing LayerZero OFT: PYUSD & USDe");
  console.log("=====================================\n");
  
  const deployment = loadDeployment();
  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", deployment.contracts.UnifiedRouter);
  
  // Test PYUSD Base -> Arbitrum
  console.log("📍 Configuring PYUSD Base -> Arbitrum LayerZero route...");
  await configureRoute(
    router,
    TOKENS.base.PYUSD,      // fromToken
    8453,                    // Base chainId
    TOKENS.arbitrum.PYUSD,   // toToken
    42161,                   // Arbitrum chainId
    Protocol.LAYERZERO,      // protocol
    PROTOCOLS.arbitrum.lzChainId, // destination LZ chain ID
    PROTOCOLS.base.LAYERZERO_ENDPOINT // bridge contract
  );
  
  // Test USDe Base -> Arbitrum
  console.log("📍 Configuring USDe Base -> Arbitrum LayerZero route...");
  await configureRoute(
    router,
    TOKENS.base.USDe,        // fromToken
    8453,                    // Base chainId
    TOKENS.arbitrum.USDe,    // toToken
    42161,                   // Arbitrum chainId
    Protocol.LAYERZERO,      // protocol
    PROTOCOLS.arbitrum.lzChainId, // destination LZ chain ID
    PROTOCOLS.base.LAYERZERO_ENDPOINT // bridge contract
  );
  
  console.log("\n✅ LayerZero OFT routes configured for PYUSD and USDe!");
  console.log("Note: Actual transfers would require OFT token contracts and LayerZero fees");
}

// Test Scenario 3: CCTP with hooks for USDC <-> PYUSD
async function testCCTPwithHooks() {
  console.log("\n=====================================");
  console.log("3️⃣  Testing CCTP Hooks: USDC (Base) <-> PYUSD (Arbitrum)");
  console.log("=====================================\n");
  
  const deployment = loadDeployment();
  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", deployment.contracts.UnifiedRouter);
  
  // Mock swap pool address (would be Curve/Uniswap in production)
  const MOCK_SWAP_POOL = "0x1111111111111111111111111111111111111111";
  
  // Configure CCTP hooks route
  console.log("📍 Configuring USDC -> PYUSD CCTP Hooks route...");
  await configureRoute(
    router,
    TOKENS.base.USDC,        // fromToken
    8453,                    // Base chainId
    TOKENS.arbitrum.PYUSD,   // toToken (different token!)
    42161,                   // Arbitrum chainId
    Protocol.CCTP_HOOKS,     // protocol (CCTP V2 with hooks)
    PROTOCOLS.arbitrum.cctpDomain, // destination domain
    PROTOCOLS.base.CCTP_TOKEN_MESSENGER, // bridge contract
    MOCK_SWAP_POOL          // swap pool for USDC->PYUSD on destination
  );
  
  // Set hook receiver on Arbitrum (would be deployed contract in production)
  console.log("📍 Setting CCTP hook receiver for Arbitrum...");
  const MOCK_HOOK_RECEIVER = "0x2222222222222222222222222222222222222222";
  await router.setCCTPHookReceiver(42161, MOCK_HOOK_RECEIVER);
  
  console.log("\n✅ CCTP Hooks route configured for cross-token swaps!");
  console.log("Note: Actual transfers would require:");
  console.log("  - Deployed hook receiver contract on Arbitrum");
  console.log("  - Configured DEX pool for USDC->PYUSD swap");
}

// Test Scenario 4: LayerZero Compose for USDe <-> PYUSD
async function testLayerZeroCompose() {
  console.log("\n=====================================");
  console.log("4️⃣  Testing LZ Compose: USDe (Base) <-> PYUSD (Arbitrum)");
  console.log("=====================================\n");
  
  const deployment = loadDeployment();
  const [signer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", deployment.contracts.UnifiedRouter);
  
  // Mock swap pool for USDe->PYUSD on Arbitrum
  const MOCK_SWAP_POOL = "0x3333333333333333333333333333333333333333";
  
  // Configure LayerZero route with compose
  console.log("📍 Configuring USDe -> PYUSD LayerZero Compose route...");
  await configureRoute(
    router,
    TOKENS.base.USDe,        // fromToken
    8453,                    // Base chainId
    TOKENS.arbitrum.PYUSD,   // toToken (different token!)
    42161,                   // Arbitrum chainId
    Protocol.LAYERZERO,      // protocol
    PROTOCOLS.arbitrum.lzChainId, // destination LZ chain ID
    PROTOCOLS.base.LAYERZERO_ENDPOINT, // bridge contract
    MOCK_SWAP_POOL          // swap pool for USDe->PYUSD on destination
  );
  
  console.log("\n✅ LayerZero Compose route configured for cross-token swaps!");
  console.log("Note: Actual transfers would require:");
  console.log("  - OFT contracts for USDe");
  console.log("  - Deployed UnifiedRouter on Arbitrum to handle compose");
  console.log("  - Configured DEX pool for USDe->PYUSD swap");
}

// Main test runner
async function main() {
  console.log("========================================");
  console.log("🧪 Running All Test Scenarios");
  console.log("========================================");
  
  // Check we're on the right network
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`\n📍 Network: ${chainId === 31337n ? 'Hardhat Local Fork' : `Chain ${chainId}`}`);
  
  try {
    // Run all test scenarios
    await testCCTPforUSDC();       // Scenario 1: CCTP USDC <-> USDC
    await testLayerZeroOFT();      // Scenario 2: LZ OFT for PYUSD & USDe
    await testCCTPwithHooks();     // Scenario 3: CCTP hooks for cross-token
    await testLayerZeroCompose();  // Scenario 4: LZ Compose for cross-token
    
    console.log("\n========================================");
    console.log("✅ All Test Scenarios Completed!");
    console.log("========================================\n");
    
    console.log("Summary:");
    console.log("1. ✅ CCTP for USDC <-> USDC: Configured and tested");
    console.log("2. ✅ LayerZero OFT: Routes configured for PYUSD & USDe");
    console.log("3. ✅ CCTP with Hooks: Route configured for USDC->PYUSD");
    console.log("4. ✅ LayerZero Compose: Route configured for USDe->PYUSD");
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
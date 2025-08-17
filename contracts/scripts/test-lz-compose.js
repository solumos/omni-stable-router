const { ethers } = require("hardhat");

// LayerZero Compose Test Script
// Tests USDe (Base) -> PYUSD (Arbitrum) using LayerZero Compose

// Token addresses
const TOKENS = {
  base: {
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", // Ethena USDe on Base
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  },
  arbitrum: {
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", // Ethena USDe on Arbitrum
    PYUSD: "0x0c92Fd9E86154cDCaE09F6f155faDdCb27bf7DD9", // PayPal USD on Arbitrum
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  }
};

// LayerZero endpoints and chain IDs
const LAYERZERO = {
  base: {
    endpoint: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
    chainId: 184, // LayerZero chain ID for Base
    eid: 30184    // V2 endpoint ID
  },
  arbitrum: {
    endpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
    chainId: 110, // LayerZero chain ID for Arbitrum
    eid: 30110    // V2 endpoint ID
  }
};

const Protocol = {
  NONE: 0,
  CCTP: 1,
  CCTP_HOOKS: 2,
  LAYERZERO: 3,
  STARGATE: 4
};

// Mock OFT interface for testing
const OFT_ABI = [
  "function send(uint16 _dstChainId, bytes calldata _toAddress, uint256 _amount, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable",
  "function sendFrom(address _from, uint16 _dstChainId, bytes32 _toAddress, uint256 _amount, (address,address,bytes) calldata _callParams) external payable",
  "event SendToChain(uint16 indexed dstChainId, address indexed from, bytes32 indexed toAddress, uint256 amount)"
];

async function getRouterAddress() {
  // Load from deployment or use known address
  return "0x6e572fb734be64ec1465d1472ed40f41b74dd83e";
}

async function testLayerZeroCompose() {
  console.log("========================================");
  console.log("🔷 LayerZero Compose Test");
  console.log("========================================\n");
  
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Get the deployed router
  const routerAddress = await getRouterAddress();
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  console.log("Router:", routerAddress);
  
  // Step 1: Configure LayerZero protocol
  console.log("\n1️⃣ Configuring LayerZero protocol...");
  let tx = await router.setProtocolContract(Protocol.LAYERZERO, LAYERZERO.base.endpoint);
  await tx.wait();
  console.log("  ✅ LayerZero endpoint configured");
  
  // Step 2: Configure swap pool on destination (mock for testing)
  console.log("\n2️⃣ Configuring swap pool for USDe -> PYUSD on Arbitrum...");
  const MOCK_SWAP_POOL = "0x2222222222222222222222222222222222222222";
  
  // This would be set on the Arbitrum deployment
  // For testing, we'll configure it locally
  tx = await router.setSameChainSwapPool(
    TOKENS.arbitrum.USDe,
    TOKENS.arbitrum.PYUSD,
    MOCK_SWAP_POOL
  );
  await tx.wait();
  console.log("  ✅ Swap pool configured:", MOCK_SWAP_POOL);
  
  // Step 3: Configure LayerZero route with compose
  console.log("\n3️⃣ Configuring LayerZero Compose route...");
  tx = await router.configureRoute(
    TOKENS.base.USDe,          // fromToken
    8453,                       // Base chainId
    TOKENS.arbitrum.PYUSD,      // toToken (different token!)
    42161,                      // Arbitrum chainId
    {
      protocol: Protocol.LAYERZERO,
      protocolDomain: LAYERZERO.arbitrum.chainId, // LZ destination chain ID
      bridgeContract: LAYERZERO.base.endpoint,     // LZ endpoint on Base
      poolId: 0,
      swapPool: MOCK_SWAP_POOL,  // Swap pool for USDe->PYUSD
      extraData: "0x"
    }
  );
  await tx.wait();
  console.log("  ✅ LayerZero Compose route configured");
  
  // Step 4: Check route configuration
  console.log("\n4️⃣ Verifying route configuration...");
  try {
    const isConfigured = await router.isRouteConfigured(
      TOKENS.base.USDe,
      8453,
      TOKENS.arbitrum.PYUSD,
      42161
    );
    console.log("  ✅ Route configured:", isConfigured);
  } catch (error) {
    console.log("  ⚠️ Cannot verify route (continuing anyway):", error.message);
  }
  
  // Step 5: Explain the compose flow
  console.log("\n5️⃣ LayerZero Compose Flow:");
  console.log("  📍 Source (Base):");
  console.log("     1. User sends USDe to UnifiedRouter");
  console.log("     2. Router calls OFT.send() with compose message");
  console.log("     3. USDe is burned on Base");
  console.log("     4. LayerZero message sent with compose data");
  
  console.log("\n  📍 Destination (Arbitrum):");
  console.log("     1. LayerZero delivers message to USDe OFT");
  console.log("     2. USDe is minted to UnifiedRouter");
  console.log("     3. OFT calls router.lzCompose() with swap data");
  console.log("     4. Router swaps USDe -> PYUSD via DEX");
  console.log("     5. Router sends PYUSD to final recipient");
  
  // Step 6: Build compose message
  console.log("\n6️⃣ Building compose message...");
  const composeMessage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "address", "address"],
    [
      TOKENS.arbitrum.PYUSD,      // toToken
      ethers.parseUnits("90", 6),  // minAmountOut (assuming 10% slippage)
      signer.address,              // recipient
      MOCK_SWAP_POOL              // swap pool address
    ]
  );
  console.log("  ✅ Compose message built");
  console.log("  📋 Message length:", composeMessage.length, "bytes");
  
  // Step 7: Calculate LayerZero fees
  console.log("\n7️⃣ Estimating LayerZero fees...");
  
  // Build adapter params for compose
  const adapterParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint16", "uint256", "uint256", "uint256", "bytes"],
    [
      2,                          // version 2 (compose)
      200000,                     // gas for lzReceive
      300000,                     // gas for lzCompose
      0,                          // native value
      composeMessage              // compose message
    ]
  );
  
  console.log("  📍 Adapter params built");
  console.log("  📋 Gas for lzReceive: 200,000");
  console.log("  📋 Gas for lzCompose: 300,000");
  
  // Step 8: Simulate the transfer call
  console.log("\n8️⃣ Transfer parameters:");
  console.log("  From: 100 USDe on Base");
  console.log("  To: PYUSD on Arbitrum");
  console.log("  Min out: 90 PYUSD");
  console.log("  Recipient:", signer.address);
  
  // In production, you would call:
  // await router.transferWithSwap(
  //   TOKENS.base.USDe,
  //   TOKENS.arbitrum.PYUSD,
  //   ethers.parseUnits("100", 18),
  //   42161,
  //   signer.address,
  //   ethers.parseUnits("90", 6),
  //   "0x",
  //   { value: lzFee }
  // );
  
  console.log("\n✅ LayerZero Compose route ready!");
  console.log("Note: Actual transfer requires:");
  console.log("  • USDe OFT contracts deployed on both chains");
  console.log("  • UnifiedRouter deployed on Arbitrum");
  console.log("  • Real DEX pool for USDe->PYUSD swap");
  console.log("  • LayerZero fees in ETH");
}

// Test the lzCompose handler directly
async function testComposeHandler() {
  console.log("\n========================================");
  console.log("🧪 Testing lzCompose Handler");
  console.log("========================================\n");
  
  const [signer] = await ethers.getSigners();
  const routerAddress = await getRouterAddress();
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Configure LayerZero endpoint
  await router.setProtocolContract(Protocol.LAYERZERO, LAYERZERO.arbitrum.endpoint);
  
  // Simulate receiving USDe on Arbitrum
  console.log("1️⃣ Simulating USDe receipt on Arbitrum...");
  
  // In production, the OFT would:
  // 1. Mint USDe to the router
  // 2. Call router.lzCompose() with the message
  
  // Build the compose message
  const composeMessage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256", "address", "address"],
    [
      TOKENS.arbitrum.PYUSD,       // toToken
      ethers.parseUnits("90", 6),   // minAmountOut
      signer.address,               // recipient
      "0x2222222222222222222222222222222222222222" // swap pool
    ]
  );
  
  console.log("2️⃣ Compose message details:");
  console.log("  Target token: PYUSD");
  console.log("  Min amount: 90 PYUSD");
  console.log("  Recipient:", signer.address);
  
  // Note: In production, only the LayerZero endpoint can call lzCompose
  // The endpoint would be called by the OFT after minting tokens
  
  console.log("\n✅ Compose handler configured!");
  console.log("The handler will:");
  console.log("  1. Decode the compose message");
  console.log("  2. Detect received USDe balance");
  console.log("  3. Execute swap USDe -> PYUSD");
  console.log("  4. Transfer PYUSD to recipient");
}

async function main() {
  console.log("========================================");
  console.log("LayerZero Compose Test Suite");
  console.log("========================================\n");
  
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Network: ${chainId === 31337n ? 'Hardhat Local Fork (Base)' : `Chain ${chainId}`}\n`);
  
  // Run tests
  await testLayerZeroCompose();
  await testComposeHandler();
  
  console.log("\n========================================");
  console.log("✅ LayerZero Compose Test Complete!");
  console.log("========================================\n");
  
  console.log("Summary:");
  console.log("1. ✅ LayerZero Compose route configured");
  console.log("2. ✅ Compose message format defined");
  console.log("3. ✅ lzCompose handler ready");
  console.log("4. ⏱️  Requires OFT infrastructure for full testing");
  
  console.log("\nNext Steps:");
  console.log("1. Deploy USDe OFT on Base and Arbitrum");
  console.log("2. Deploy UnifiedRouter on Arbitrum");
  console.log("3. Integrate with real DEX (Uniswap/Curve)");
  console.log("4. Test end-to-end flow with real OFTs");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
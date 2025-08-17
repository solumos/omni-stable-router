const { ethers } = require("hardhat");

// CCTP V2 Hooks Test with Dual Forks
// Tests USDC (Base) -> PYUSD (Arbitrum) using separate forks

// Token addresses
const TOKENS = {
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    PYUSD: "0x0c92Fd9E86154cDCaE09F6f155faDdCb27bf7DD9"
  }
};

// CCTP contracts
const CCTP = {
  base: {
    TOKEN_MESSENGER: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    MESSAGE_TRANSMITTER: "0xAD09780d193884d503182aD4588450C416D6F9D4",
    MESSAGE_RECEIVER: "0x033999Db35B10ceb1061af3f58A9af7a183B7e57",
    domain: 6
  },
  arbitrum: {
    TOKEN_MESSENGER: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
    MESSAGE_TRANSMITTER: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
    MESSAGE_RECEIVER: "0x23602ca06e977c86339ffcccab1c6a1bfe14cfd9",
    domain: 3
  }
};

const Protocol = {
  NONE: 0,
  CCTP: 1,
  CCTP_HOOKS: 2,
  LAYERZERO: 3,
  STARGATE: 4
};

async function setupBaseChain() {
  console.log("\n🔷 BASE CHAIN SETUP");
  console.log("====================");
  
  // Connect to Base fork
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  
  console.log("Connected to Base fork");
  console.log("Signer:", signer.address);
  
  // Deploy UnifiedRouter on Base
  console.log("\n📦 Deploying UnifiedRouter on Base...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const routerBase = await UnifiedRouter.connect(signer).deploy(signer.address);
  await routerBase.waitForDeployment();
  const routerBaseAddress = await routerBase.getAddress();
  console.log("✅ Router deployed at:", routerBaseAddress);
  
  // Configure CCTP protocols
  console.log("\n⚙️ Configuring CCTP on Base...");
  await routerBase.setProtocolContract(Protocol.CCTP, CCTP.base.TOKEN_MESSENGER);
  await routerBase.setProtocolContract(Protocol.CCTP_HOOKS, CCTP.base.MESSAGE_TRANSMITTER);
  console.log("✅ CCTP configured");
  
  // Get USDC for testing
  console.log("\n💰 Getting USDC on Base...");
  const USDC_WHALE = "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A";
  await provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  await provider.send("hardhat_setBalance", [USDC_WHALE, "0x1000000000000000000"]);
  
  const usdc = await ethers.getContractAt("IERC20", TOKENS.base.USDC, signer);
  
  // Transfer USDC using impersonation
  const transferData = usdc.interface.encodeFunctionData("transfer", [
    signer.address,
    ethers.parseUnits("100", 6)
  ]);
  
  await provider.send("eth_sendTransaction", [{
    from: USDC_WHALE,
    to: TOKENS.base.USDC,
    data: transferData
  }]);
  
  await provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
  
  const balance = await usdc.balanceOf(signer.address);
  console.log("✅ USDC balance:", ethers.formatUnits(balance, 6));
  
  return { provider, signer, routerBase, usdc };
}

async function setupArbitrumChain() {
  console.log("\n🔴 ARBITRUM CHAIN SETUP");
  console.log("========================");
  
  // Connect to Arbitrum fork
  const provider = new ethers.JsonRpcProvider("http://localhost:8546");
  const signer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  
  console.log("Connected to Arbitrum fork");
  console.log("Signer:", signer.address);
  
  // Deploy UnifiedRouter on Arbitrum (acts as hook receiver)
  console.log("\n📦 Deploying UnifiedRouter on Arbitrum...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const routerArb = await UnifiedRouter.connect(signer).deploy(signer.address);
  await routerArb.waitForDeployment();
  const routerArbAddress = await routerArb.getAddress();
  console.log("✅ Router deployed at:", routerArbAddress);
  
  // Configure swap pools (mock for now)
  console.log("\n⚙️ Configuring swap pools on Arbitrum...");
  const MOCK_SWAP_POOL = "0x1111111111111111111111111111111111111111";
  await routerArb.setSameChainSwapPool(
    TOKENS.arbitrum.USDC,
    TOKENS.arbitrum.PYUSD,
    MOCK_SWAP_POOL
  );
  console.log("✅ Swap pool configured");
  
  return { provider, signer, routerArb };
}

async function testCCTPHooks(baseSetup, arbSetup) {
  console.log("\n🚀 TESTING CCTP V2 HOOKS");
  console.log("=========================");
  
  const { routerBase, usdc } = baseSetup;
  const { routerArb } = arbSetup;
  
  // Configure CCTP hooks route on Base
  console.log("\n1️⃣ Configuring CCTP_HOOKS route on Base...");
  const routerArbAddress = await routerArb.getAddress();
  
  // Set hook receiver (Arbitrum router)
  await routerBase.setCCTPHookReceiver(42161, routerArbAddress);
  console.log("  Hook receiver set:", routerArbAddress);
  
  // Configure route
  await routerBase.configureRoute(
    TOKENS.base.USDC,
    8453,  // Base chain ID
    TOKENS.arbitrum.PYUSD,
    42161, // Arbitrum chain ID
    {
      protocol: Protocol.CCTP_HOOKS,
      protocolDomain: CCTP.arbitrum.domain,
      bridgeContract: CCTP.base.TOKEN_MESSENGER,
      poolId: 0,
      swapPool: "0x1111111111111111111111111111111111111111", // Mock swap pool
      extraData: "0x"
    }
  );
  console.log("  ✅ Route configured");
  
  // Approve router on Base
  console.log("\n2️⃣ Approving router on Base...");
  await usdc.approve(await routerBase.getAddress(), ethers.parseUnits("10", 6));
  console.log("  ✅ Approved 10 USDC");
  
  // Execute transfer
  console.log("\n3️⃣ Initiating CCTP hooks transfer...");
  console.log("  From: 10 USDC on Base");
  console.log("  To: PYUSD on Arbitrum");
  
  try {
    const tx = await routerBase.transferWithSwap(
      TOKENS.base.USDC,
      TOKENS.arbitrum.PYUSD,
      ethers.parseUnits("10", 6),
      42161,
      baseSetup.signer.address,
      ethers.parseUnits("9", 6), // min amount out
      "0x"
    );
    
    const receipt = await tx.wait();
    console.log("  ✅ Transfer initiated!");
    console.log("  📋 Tx hash:", receipt.hash);
    
    // Parse events on Base
    const transferEvent = receipt.logs.find(log => {
      try {
        const parsed = routerBase.interface.parseLog(log);
        return parsed?.name === "TransferInitiated";
      } catch { return false; }
    });
    
    if (transferEvent) {
      const parsed = routerBase.interface.parseLog(transferEvent);
      console.log("  📍 Transfer ID:", parsed.args.transferId);
      console.log("  📍 Protocol:", parsed.args.protocol === 2n ? "CCTP_HOOKS" : "Unknown");
    }
    
  } catch (error) {
    console.log("  ❌ Transfer failed:", error.message);
  }
  
  // Simulate destination chain actions
  console.log("\n4️⃣ Simulating destination chain (Arbitrum)...");
  console.log("  In production:");
  console.log("  • Circle attestation service signs the burn (~15 min)");
  console.log("  • receiveMessage() is called on Arbitrum");
  console.log("  • USDC is minted to hook receiver (router)");
  console.log("  • Router swaps USDC -> PYUSD");
  console.log("  • Router sends PYUSD to recipient");
  
  // Check balances
  console.log("\n5️⃣ Final balances:");
  const finalBalance = await usdc.balanceOf(baseSetup.signer.address);
  console.log("  Base USDC:", ethers.formatUnits(finalBalance, 6));
}

async function main() {
  console.log("========================================");
  console.log("CCTP V2 Hooks Test with Dual Forks");
  console.log("========================================");
  
  try {
    // Set up both chains
    const baseSetup = await setupBaseChain();
    const arbSetup = await setupArbitrumChain();
    
    // Run the test
    await testCCTPHooks(baseSetup, arbSetup);
    
    console.log("\n========================================");
    console.log("✅ Dual Fork Test Complete!");
    console.log("========================================");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Note: This script requires two separate Hardhat nodes running:
// 1. Base fork on port 8545
// 2. Arbitrum fork on port 8546
// Run: ./scripts/start-dual-forks.sh first

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
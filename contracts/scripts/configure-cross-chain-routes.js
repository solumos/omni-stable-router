const { ethers } = require("hardhat");
const testnetAddresses = require("./testnet-addresses");

async function main() {
  console.log("🌉 Configuring cross-chain routes between testnets...\n");
  
  // Contract addresses
  const baseRouter = "0xC40c9276eaD77e75947a51b49b773A865aa8d1Be";
  const arbRouter = "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B";
  
  // First configure Base Sepolia -> Arbitrum Sepolia route
  console.log("1️⃣ Configuring Base Sepolia -> Arbitrum Sepolia route...");
  
  const baseRouterContract = await ethers.getContractAt("UnifiedRouter", baseRouter);
  
  const baseToArbRoute = {
    protocol: 1, // CCTP
    protocolDomain: testnetAddresses.cctp.arbitrumSepolia.domain, // Arbitrum domain
    bridgeContract: testnetAddresses.cctp.baseSepolia.tokenMessenger,
    poolId: 0,
    swapPool: ethers.ZeroAddress,
    extraData: "0x"
  };
  
  let tx = await baseRouterContract.configureRoute(
    testnetAddresses.tokens.baseSepolia.usdc,     // fromToken (Base USDC)
    testnetAddresses.chainIds.baseSepolia,        // fromChainId
    testnetAddresses.tokens.arbitrumSepolia.usdc, // toToken (Arbitrum USDC)
    testnetAddresses.chainIds.arbitrumSepolia,    // toChainId
    baseToArbRoute
  );
  await tx.wait();
  console.log("✅ Base -> Arbitrum route configured");
}

// Run with: npx hardhat run scripts/configure-cross-chain-routes.js --network baseSepolia
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

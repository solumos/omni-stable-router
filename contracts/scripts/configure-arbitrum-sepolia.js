const { ethers } = require("hardhat");
const testnetAddresses = require("./testnet-addresses");

async function main() {
  const routerAddress = "0x3d7F0B765Fe5BA84d50340230a6fFC060d16Be1B";
  const swapExecutorAddress = "0x77CbBF036d9403b36F19C6A0A9Afffa45cA40950";
  
  console.log("🔧 Configuring Arbitrum Sepolia UnifiedRouter...");
  console.log("Router:", routerAddress);
  console.log("SwapExecutor:", swapExecutorAddress);
  
  const [deployer] = await ethers.getSigners();
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  const config = testnetAddresses.cctp.arbitrumSepolia;
  
  console.log("\n1️⃣ Setting CCTP protocol...");
  let tx = await router.setProtocolContract(1, config.tokenMessenger);
  await tx.wait();
  console.log("✅ CCTP configured");
  
  console.log("\n2️⃣ Setting LayerZero protocol...");
  const lzConfig = testnetAddresses.layerZero.arbitrumSepolia;
  tx = await router.setProtocolContract(3, lzConfig.endpoint);
  await tx.wait();
  console.log("✅ LayerZero configured");
  
  console.log("\n3️⃣ Configuring basic USDC route...");
  const basicRoute = {
    protocol: 1,
    protocolDomain: config.domain,
    bridgeContract: config.tokenMessenger,
    poolId: 0,
    swapPool: ethers.ZeroAddress,
    extraData: "0x"
  };
  
  const chainId = testnetAddresses.chainIds.arbitrumSepolia;
  const usdc = testnetAddresses.tokens.arbitrumSepolia.usdc;
  
  tx = await router.configureRoute(
    usdc, chainId, usdc, chainId, basicRoute
  );
  await tx.wait();
  console.log("✅ Basic USDC route configured");
  
  console.log("\n4️⃣ Verifying configuration...");
  const cctpContract = await router.protocolContracts(1);
  const lzContract = await router.protocolContracts(3);
  const routeConfigured = await router.isRouteConfigured(usdc, chainId, usdc, chainId);
  
  console.log("CCTP contract:", cctpContract);
  console.log("LayerZero contract:", lzContract);
  console.log("Route configured:", routeConfigured);
  
  console.log("\n✅ Arbitrum Sepolia configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

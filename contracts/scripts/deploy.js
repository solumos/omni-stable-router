const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log("Deploying to chain ID:", chainId);

  // Get protocol addresses based on chain
  const protocolAddresses = getProtocolAddresses(chainId);

  // Deploy FeeManager
  console.log("\nDeploying FeeManager...");
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(deployer.address);
  await feeManager.waitForDeployment();
  console.log("FeeManager deployed to:", await feeManager.getAddress());

  // Deploy SwapExecutor
  console.log("\nDeploying SwapExecutor...");
  const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy();
  await swapExecutor.waitForDeployment();
  console.log("SwapExecutor deployed to:", await swapExecutor.getAddress());

  // Deploy RouteProcessor (UUPS upgradeable)
  console.log("\nDeploying RouteProcessor (UUPS)...");
  const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
  const routeProcessor = await upgrades.deployProxy(
    RouteProcessor,
    [
      deployer.address,
      protocolAddresses.cctpTokenMessenger,
      protocolAddresses.cctpMessageTransmitter,
      protocolAddresses.layerZeroEndpoint,
      protocolAddresses.stargateRouter
    ],
    { 
      initializer: "initialize",
      kind: "uups"
    }
  );
  await routeProcessor.waitForDeployment();
  console.log("RouteProcessor deployed to:", await routeProcessor.getAddress());

  // Deploy StableRouter (UUPS Proxy)
  console.log("\nDeploying StableRouter (UUPS)...");
  const StableRouter = await ethers.getContractFactory("StableRouter");
  const stableRouter = await upgrades.deployProxy(
    StableRouter,
    [
      await routeProcessor.getAddress(),
      await swapExecutor.getAddress(),
      await feeManager.getAddress()
    ],
    { 
      initializer: "initialize",
      kind: "uups"
    }
  );
  await stableRouter.waitForDeployment();
  console.log("StableRouter deployed to:", await stableRouter.getAddress());

  // Configure FeeManager
  console.log("\nConfiguring FeeManager...");
  await feeManager.authorizeCollector(await stableRouter.getAddress(), true);
  console.log("Authorized StableRouter as fee collector");

  // Configure token mappings on RouteProcessor
  console.log("\nConfiguring token mappings...");
  await configureTokenMappings(routeProcessor, chainId);

  // Configure swap pools
  console.log("\nConfiguring swap pools...");
  await configureSwapPools(swapExecutor, chainId);

  console.log("\n=== Deployment Complete ===");
  console.log("FeeManager:", await feeManager.getAddress());
  console.log("SwapExecutor:", await swapExecutor.getAddress());
  console.log("RouteProcessor:", await routeProcessor.getAddress());
  console.log("StableRouter:", await stableRouter.getAddress());

  // Save deployment addresses
  await saveDeploymentAddresses({
    chainId,
    feeManager: await feeManager.getAddress(),
    swapExecutor: await swapExecutor.getAddress(),
    routeProcessor: await routeProcessor.getAddress(),
    stableRouter: await stableRouter.getAddress()
  });
}

function getProtocolAddresses(chainId) {
  const addresses = {
    1: { // Ethereum
      cctpTokenMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
      cctpMessageTransmitter: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2 endpoint
      stargateRouter: "0x8731d54E9D02c286767d56ac03e8037C07e01e98"
    },
    42161: { // Arbitrum
      cctpTokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
      cctpMessageTransmitter: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2 endpoint
      stargateRouter: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614"
    },
    10: { // Optimism
      cctpTokenMessenger: "0x2B4069517957735bE00ceE0fadAE88a26365528f",
      cctpMessageTransmitter: "0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2 endpoint
      stargateRouter: "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b"
    },
    8453: { // Base
      cctpTokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
      cctpMessageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2 endpoint
      stargateRouter: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B"
    },
    137: { // Polygon
      cctpTokenMessenger: "0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE",
      cctpMessageTransmitter: "0xF3be9355363857F3e001be68856A2f96b4C39Ba9",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2 endpoint
      stargateRouter: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd"
    },
    43114: { // Avalanche
      cctpTokenMessenger: "0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982",
      cctpMessageTransmitter: "0x8186359aF5F57FbB40c6b14A588d2A59C0C29880",
      layerZeroEndpoint: "0x1a44076050125825900e736c501f859c50fE728c", // V2 endpoint
      stargateRouter: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd"
    }
  };

  return addresses[chainId] || addresses[1];
}

async function configureTokenMappings(routeProcessor, chainId) {
  const tokenMappings = getTokenMappings(chainId);
  const swapRouters = getSwapRouters();
  
  // Configure tokens
  for (const [token, config] of Object.entries(tokenMappings)) {
    console.log(`Configuring ${token}...`);
    await routeProcessor.configureToken(
      config.address,
      config.isUSDC || false,
      config.oft || ethers.ZeroAddress,
      config.stargatePoolId || 0
    );
  }
  
  // Configure destination swap routers
  for (const [destChainId, router] of Object.entries(swapRouters)) {
    if (Number(destChainId) !== chainId) {
      console.log(`Setting swap router for chain ${destChainId}: ${router}`);
      await routeProcessor.setDestinationSwapRouter(Number(destChainId), router);
    }
  }
}

function getTokenMappings(chainId) {
  const mappings = {
    1: { // Ethereum
      USDC: {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        isUSDC: true,
        oft: null,
        stargatePoolId: 0
      },
      PYUSD: {
        address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
        oft: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // OFT address
        stargatePoolId: 0
      },
      USDT: {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        oft: null,
        stargatePoolId: 2
      },
      USDe: {
        address: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3",
        oft: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3", // OFT address
        stargatePoolId: 0
      },
      crvUSD: {
        address: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",
        oft: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E", // OFT address
        stargatePoolId: 0
      }
    },
    // Add other chains...
  };

  return mappings[chainId] || mappings[1];
}

function getSwapRouters() {
  // These would be 1inch/0x/etc routers on each chain
  return {
    1: "0x1111111254EEB25477B68fb85Ed929f73A960582",     // 1inch on Ethereum
    42161: "0x1111111254EEB25477B68fb85Ed929f73A960582",  // 1inch on Arbitrum
    10: "0x1111111254EEB25477B68fb85Ed929f73A960582",     // 1inch on Optimism
    8453: "0x1111111254EEB25477B68fb85Ed929f73A960582",   // 1inch on Base
    137: "0x1111111254EEB25477B68fb85Ed929f73A960582",    // 1inch on Polygon
    43114: "0x1111111254EEB25477B68fb85Ed929f73A960582"   // 1inch on Avalanche
  };
}

async function configureSwapPools(swapExecutor, chainId) {
  const pools = getSwapPools(chainId);
  
  for (const pool of pools) {
    console.log(`Configuring pool for ${pool.tokenA}/${pool.tokenB}...`);
    await swapExecutor.configurePool(
      pool.tokenA,
      pool.tokenB,
      pool.pool,
      pool.dexType,
      pool.poolData
    );
  }
}

function getSwapPools(chainId) {
  const pools = {
    1: [ // Ethereum
      {
        tokenA: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        tokenB: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
        pool: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // Curve 3Pool
        dexType: 0, // Curve
        poolData: ethers.AbiCoder.defaultAbiCoder().encode(["int128", "int128"], [0, 2])
      },
      {
        tokenA: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        tokenB: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // PYUSD
        pool: "0x0000000000000000000000000000000000000000", // Uniswap V3 pool
        dexType: 1, // UniswapV3
        poolData: ethers.AbiCoder.defaultAbiCoder().encode(["uint24"], [500]) // 0.05% fee
      }
    ],
    // Add other chains...
  };

  return pools[chainId] || pools[1];
}

async function saveDeploymentAddresses(deployment) {
  const fs = require("fs");
  const path = require("path");
  
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = path.join(deploymentsDir, `${deployment.chainId}.json`);
  fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));
  console.log(`\nDeployment addresses saved to ${filename}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
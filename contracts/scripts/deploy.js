const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
  console.log("Deploying to chain ID:", chainId);

  // Get protocol addresses based on chain
  const protocolAddresses = getProtocolAddresses(chainId);

  // Deploy FeeManager
  console.log("\nDeploying FeeManager...");
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(deployer.address);
  await feeManager.deployed();
  console.log("FeeManager deployed to:", feeManager.address);

  // Deploy SwapExecutor
  console.log("\nDeploying SwapExecutor...");
  const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
  const swapExecutor = await SwapExecutor.deploy();
  await swapExecutor.deployed();
  console.log("SwapExecutor deployed to:", swapExecutor.address);

  // Deploy RouteProcessor
  console.log("\nDeploying RouteProcessor...");
  const RouteProcessor = await ethers.getContractFactory("RouteProcessor");
  const routeProcessor = await RouteProcessor.deploy(
    protocolAddresses.cctpMessenger,
    protocolAddresses.layerZeroEndpoint,
    protocolAddresses.stargateRouter
  );
  await routeProcessor.deployed();
  console.log("RouteProcessor deployed to:", routeProcessor.address);

  // Deploy StableRouter (UUPS Proxy)
  console.log("\nDeploying StableRouter (UUPS)...");
  const StableRouter = await ethers.getContractFactory("StableRouter");
  const stableRouter = await upgrades.deployProxy(
    StableRouter,
    [
      routeProcessor.address,
      swapExecutor.address,
      feeManager.address
    ],
    { 
      initializer: "initialize",
      kind: "uups"
    }
  );
  await stableRouter.deployed();
  console.log("StableRouter deployed to:", stableRouter.address);

  // Configure FeeManager
  console.log("\nConfiguring FeeManager...");
  await feeManager.authorizeCollector(stableRouter.address, true);
  console.log("Authorized StableRouter as fee collector");

  // Configure token mappings on RouteProcessor
  console.log("\nConfiguring token mappings...");
  await configureTokenMappings(routeProcessor, chainId);

  // Configure swap pools
  console.log("\nConfiguring swap pools...");
  await configureSwapPools(swapExecutor, chainId);

  console.log("\n=== Deployment Complete ===");
  console.log("FeeManager:", feeManager.address);
  console.log("SwapExecutor:", swapExecutor.address);
  console.log("RouteProcessor:", routeProcessor.address);
  console.log("StableRouter:", stableRouter.address);

  // Save deployment addresses
  await saveDeploymentAddresses({
    chainId,
    feeManager: feeManager.address,
    swapExecutor: swapExecutor.address,
    routeProcessor: routeProcessor.address,
    stableRouter: stableRouter.address
  });
}

function getProtocolAddresses(chainId) {
  const addresses = {
    1: { // Ethereum
      cctpMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
      layerZeroEndpoint: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
      stargateRouter: "0x8731d54E9D02c286767d56ac03e8037C07e01e98"
    },
    42161: { // Arbitrum
      cctpMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
      layerZeroEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
      stargateRouter: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614"
    },
    10: { // Optimism
      cctpMessenger: "0x2B4069517957735bE00ceE0fadAE88a26365528f",
      layerZeroEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
      stargateRouter: "0xB0D502E938ed5f4df2E681fE6E419ff29631d62b"
    },
    8453: { // Base
      cctpMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
      layerZeroEndpoint: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
      stargateRouter: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B"
    },
    137: { // Polygon
      cctpMessenger: "0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE",
      layerZeroEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
      stargateRouter: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd"
    },
    43114: { // Avalanche
      cctpMessenger: "0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982",
      layerZeroEndpoint: "0x3c2269811836af69497E5F486A85D7316753cf62",
      stargateRouter: "0x45A01E4e04F14f7A4a6702c74187c5F6222033cd"
    }
  };

  return addresses[chainId] || addresses[1];
}

async function configureTokenMappings(routeProcessor, chainId) {
  const tokenMappings = getTokenMappings(chainId);
  
  for (const [token, config] of Object.entries(tokenMappings)) {
    console.log(`Configuring ${token}...`);
    await routeProcessor.setTokenMappings(
      config.address,
      config.oft || ethers.constants.AddressZero,
      config.stargatePoolId || 0
    );
  }
}

function getTokenMappings(chainId) {
  const mappings = {
    1: { // Ethereum
      USDC: {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
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
        poolData: ethers.utils.defaultAbiCoder.encode(["int128", "int128"], [0, 2])
      },
      {
        tokenA: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
        tokenB: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // PYUSD
        pool: "0x0000000000000000000000000000000000000000", // Uniswap V3 pool
        dexType: 1, // UniswapV3
        poolData: ethers.utils.defaultAbiCoder.encode(["uint24"], [500]) // 0.05% fee
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
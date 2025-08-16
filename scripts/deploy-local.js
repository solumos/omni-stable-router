const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Mock addresses for local testing
const MOCK_ADDRESSES = {
  lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
  cctpTokenMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
  cctpMessageTransmitter: "0x0a992d191DEeC32aFe36203Ad87D0d54704a6f5",
  usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  pyusd: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
  usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  curve3Pool: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
  uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
};

async function deployMockTokens() {
  console.log("\n📦 Deploying Mock Tokens...");
  
  const MockToken = await ethers.getContractFactory("MockERC20");
  
  // Deploy mock USDC
  const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);
  
  // Deploy mock PYUSD
  const pyusd = await MockToken.deploy("PayPal USD", "PYUSD", 6);
  await pyusd.waitForDeployment();
  const pyusdAddress = await pyusd.getAddress();
  console.log("✅ Mock PYUSD deployed to:", pyusdAddress);
  
  // Deploy mock USDT
  const usdt = await MockToken.deploy("Tether USD", "USDT", 6);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("✅ Mock USDT deployed to:", usdtAddress);
  
  return { usdc, pyusd, usdt, usdcAddress, pyusdAddress, usdtAddress };
}

async function deployMockProtocols() {
  console.log("\n🔧 Deploying Mock Protocols...");
  
  // Deploy mock LayerZero endpoint
  const MockLZEndpoint = await ethers.getContractFactory("MockLZEndpoint");
  const lzEndpoint = await MockLZEndpoint.deploy();
  await lzEndpoint.waitForDeployment();
  const lzEndpointAddress = await lzEndpoint.getAddress();
  console.log("✅ Mock LZ Endpoint deployed to:", lzEndpointAddress);
  
  // Deploy mock CCTP contracts
  const MockCCTP = await ethers.getContractFactory("MockCCTP");
  const cctpTokenMessenger = await MockCCTP.deploy();
  await cctpTokenMessenger.waitForDeployment();
  const cctpTokenMessengerAddress = await cctpTokenMessenger.getAddress();
  console.log("✅ Mock CCTP Token Messenger deployed to:", cctpTokenMessengerAddress);
  
  const cctpMessageTransmitter = await MockCCTP.deploy();
  await cctpMessageTransmitter.waitForDeployment();
  const cctpMessageTransmitterAddress = await cctpMessageTransmitter.getAddress();
  console.log("✅ Mock CCTP Message Transmitter deployed to:", cctpMessageTransmitterAddress);
  
  // Deploy mock DEX contracts
  const MockDEX = await ethers.getContractFactory("MockDEX");
  const mockDex = await MockDEX.deploy();
  await mockDex.waitForDeployment();
  const mockDexAddress = await mockDex.getAddress();
  console.log("✅ Mock DEX deployed to:", mockDexAddress);
  
  return {
    lzEndpoint,
    cctpTokenMessenger,
    cctpMessageTransmitter,
    mockDex,
    lzEndpointAddress,
    cctpTokenMessengerAddress,
    cctpMessageTransmitterAddress,
    mockDexAddress
  };
}

async function deployRouter(tokens, protocols) {
  console.log("\n🚀 Deploying StablecoinRouter...");
  
  const [deployer] = await ethers.getSigners();
  const Router = await ethers.getContractFactory("StablecoinRouter");
  
  const router = await Router.deploy(
    protocols.lzEndpointAddress,
    protocols.cctpTokenMessengerAddress,
    protocols.cctpMessageTransmitterAddress,
    30184, // Base endpoint ID for testing
    deployer.address
  );
  
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ StablecoinRouter deployed to:", routerAddress);
  
  return router;
}

async function setupRouter(router, tokens) {
  console.log("\n⚙️ Configuring Router...");
  
  const [deployer] = await ethers.getSigners();
  
  // Set up remote routers (mock addresses for testing)
  await router.setRemoteRouter(30101, deployer.address); // Ethereum
  await router.setRemoteRouter(30106, deployer.address); // Avalanche
  await router.setRemoteRouter(30110, deployer.address); // Arbitrum
  console.log("✅ Remote routers configured");
  
  // Set up Curve pools (mock)
  const { usdcAddress, usdtAddress } = tokens;
  await router.setCurvePool(usdcAddress, usdtAddress, tokens.mockDexAddress);
  console.log("✅ DEX pools configured");
}

async function mintTestTokens(tokens) {
  console.log("\n💰 Minting Test Tokens...");
  
  const [deployer, user1, user2] = await ethers.getSigners();
  const amount = ethers.parseUnits("10000", 6); // 10,000 tokens
  
  // Mint to deployer
  await tokens.usdc.mint(deployer.address, amount);
  await tokens.pyusd.mint(deployer.address, amount);
  await tokens.usdt.mint(deployer.address, amount);
  console.log(`✅ Minted 10,000 of each token to deployer: ${deployer.address}`);
  
  // Mint to test users
  await tokens.usdc.mint(user1.address, amount);
  await tokens.pyusd.mint(user1.address, amount);
  await tokens.usdt.mint(user1.address, amount);
  console.log(`✅ Minted 10,000 of each token to user1: ${user1.address}`);
  
  await tokens.usdc.mint(user2.address, amount);
  await tokens.pyusd.mint(user2.address, amount);
  await tokens.usdt.mint(user2.address, amount);
  console.log(`✅ Minted 10,000 of each token to user2: ${user2.address}`);
}

async function saveDeployment(addresses) {
  console.log("\n💾 Saving Deployment Info...");
  
  const deployment = {
    network: "localhost",
    chainId: 31337,
    contracts: addresses,
    deployedAt: new Date().toISOString()
  };
  
  const deploymentPath = path.join(__dirname, "../deployments/localhost.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  
  console.log("✅ Deployment info saved to deployments/localhost.json");
}

async function main() {
  console.log("====================================");
  console.log("   Local Environment Setup");
  console.log("====================================");
  
  const [deployer] = await ethers.getSigners();
  console.log("\n👤 Deployer address:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💵 Deployer balance:", ethers.formatEther(balance), "ETH");
  
  try {
    // Deploy mock tokens
    const tokens = await deployMockTokens();
    
    // Deploy mock protocols
    const protocols = await deployMockProtocols();
    
    // Deploy router
    const router = await deployRouter(tokens, protocols);
    const routerAddress = await router.getAddress();
    
    // Configure router
    await setupRouter(router, { ...tokens, mockDexAddress: protocols.mockDexAddress });
    
    // Mint test tokens
    await mintTestTokens(tokens);
    
    // Save deployment info
    await saveDeployment({
      router: routerAddress,
      usdc: tokens.usdcAddress,
      pyusd: tokens.pyusdAddress,
      usdt: tokens.usdtAddress,
      lzEndpoint: protocols.lzEndpointAddress,
      cctpTokenMessenger: protocols.cctpTokenMessengerAddress,
      cctpMessageTransmitter: protocols.cctpMessageTransmitterAddress,
      mockDex: protocols.mockDexAddress
    });
    
    console.log("\n====================================");
    console.log("   ✅ Setup Complete!");
    console.log("====================================");
    console.log("\n📋 Next Steps:");
    console.log("1. Start the frontend: cd frontend && npm run dev");
    console.log("2. Connect your wallet to localhost network");
    console.log("3. Import test tokens to your wallet:");
    console.log(`   - USDC: ${tokens.usdcAddress}`);
    console.log(`   - PYUSD: ${tokens.pyusdAddress}`);
    console.log(`   - USDT: ${tokens.usdtAddress}`);
    console.log("\n🔑 Test Accounts (with 10,000 tokens each):");
    const [, user1, user2] = await ethers.getSigners();
    console.log(`   - User 1: ${user1.address}`);
    console.log(`   - User 2: ${user2.address}`);
    
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
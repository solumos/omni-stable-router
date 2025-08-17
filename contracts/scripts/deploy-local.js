const { ethers } = require("hardhat");
const fs = require("fs");

// Base mainnet addresses
const BASE_MAINNET_CONFIG = {
  chainId: 8453,
  tokens: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // Bridged USDC
  },
  protocols: {
    CCTP_TOKEN_MESSENGER: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    CCTP_MESSAGE_TRANSMITTER: "0xAD09780d193884d503182aD4588450C416D6F9D4",
    LAYERZERO_ENDPOINT: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
    STARGATE_ROUTER: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B"
  },
  cctpDomain: 6,
  lzChainId: 184
};

async function deployLocal() {
  console.log("========================================");
  console.log("Deploying on Local Base Fork");
  console.log("========================================\n");
  
  // Get signers from the local fork
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");
  
  // Deploy UnifiedRouter
  console.log("📦 Deploying UnifiedRouter...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const router = await UnifiedRouter.deploy(deployer.address);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ UnifiedRouter deployed at:", routerAddress);
  
  // Configure protocols
  console.log("\n⚙️ Configuring protocols...");
  
  // Protocol enum values
  const Protocol = {
    NONE: 0,
    CCTP: 1,
    CCTP_HOOKS: 2,
    LAYERZERO: 3,
    STARGATE: 4
  };
  
  // Set CCTP
  const tx1 = await router.setProtocolContract(Protocol.CCTP, BASE_MAINNET_CONFIG.protocols.CCTP_TOKEN_MESSENGER);
  await tx1.wait();
  console.log("✅ CCTP configured");
  
  // Set CCTP Hooks (Message Transmitter)
  const tx2 = await router.setProtocolContract(Protocol.CCTP_HOOKS, BASE_MAINNET_CONFIG.protocols.CCTP_MESSAGE_TRANSMITTER);
  await tx2.wait();
  console.log("✅ CCTP Hooks configured");
  
  // Set LayerZero
  const tx3 = await router.setProtocolContract(Protocol.LAYERZERO, BASE_MAINNET_CONFIG.protocols.LAYERZERO_ENDPOINT);
  await tx3.wait();
  console.log("✅ LayerZero configured");
  
  // Set Stargate
  const tx4 = await router.setProtocolContract(Protocol.STARGATE, BASE_MAINNET_CONFIG.protocols.STARGATE_ROUTER);
  await tx4.wait();
  console.log("✅ Stargate configured");
  
  // Save deployment
  const deployment = {
    network: "localhost",
    chain: "base-fork",
    chainId: BASE_MAINNET_CONFIG.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      UnifiedRouter: routerAddress
    },
    protocols: BASE_MAINNET_CONFIG.protocols,
    tokens: BASE_MAINNET_CONFIG.tokens
  };
  
  fs.writeFileSync(
    "./deployments/localhost.json",
    JSON.stringify(deployment, null, 2)
  );
  
  console.log("\n💾 Deployment saved to ./deployments/localhost.json");
  
  console.log("\n========================================");
  console.log("✅ Deployment Complete!");
  console.log("========================================\n");
  
  console.log("Next steps:");
  console.log("1. Fund account with USDC");
  console.log("2. Run test-local-cctp.js to test transfers");
  
  return deployment;
}

async function main() {
  await deployLocal();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
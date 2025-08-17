const { ethers } = require("hardhat");
const fs = require("fs");

// Mainnet Protocol Addresses (will work on Tenderly forks)
const MAINNET_PROTOCOLS = {
  ethereum: {
    CCTP_TOKEN_MESSENGER: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
    CCTP_MESSAGE_TRANSMITTER: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
    LAYERZERO_ENDPOINT: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675",
    STARGATE_ROUTER: "0x8731d54E9D02c286767d56ac03e8037C07e01e98",
    // Real mainnet tokens
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    PYUSD: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    USDe: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3"
  },
  base: {
    CCTP_TOKEN_MESSENGER: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    CCTP_MESSAGE_TRANSMITTER: "0xAD09780d193884d503182aD4588450C416D6F9D4",
    LAYERZERO_ENDPOINT: "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7",
    STARGATE_ROUTER: "0x45f1A95A4D3f3836523F5c83673c797f4d4d263B",
    // Real mainnet tokens
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // Bridged USDC
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    PYUSD: "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4",
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
  },
  arbitrum: {
    CCTP_TOKEN_MESSENGER: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
    CCTP_MESSAGE_TRANSMITTER: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
    LAYERZERO_ENDPOINT: "0x3c2269811836af69497E5F486A85D7316753cf62",
    STARGATE_ROUTER: "0x53Bf833A5d6c4ddA888F69c22C88C9f356a41614",
    // Real mainnet tokens
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Native USDC
    USDCe: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // Bridged USDC
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    PYUSD: "0x0000000000000000000000000000000000000000", // Not deployed on Arbitrum yet
    USDe: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"
  }
};

// Chain IDs for LayerZero and CCTP
const CHAIN_CONFIG = {
  ethereum: {
    chainId: 9923, // Tenderly fork chain ID
    realChainId: 1, // Actual mainnet chain ID
    cctpDomain: 0,
    lzChainId: 101
  },
  base: {
    chainId: 84539, // Tenderly fork chain ID
    realChainId: 8453, // Actual Base chain ID
    cctpDomain: 6,
    lzChainId: 184
  },
  arbitrum: {
    chainId: 9924, // Tenderly fork chain ID
    realChainId: 42161, // Actual Arbitrum chain ID
    cctpDomain: 3,
    lzChainId: 110
  }
};

async function deployOnTenderly() {
  const network = hre.network.name;
  const [deployer] = await ethers.getSigners();
  
  // Determine which mainnet we're forking
  let chainName;
  if (network === "tenderlyMainnet") {
    chainName = "ethereum";
  } else if (network === "tenderlyBase") {
    chainName = "base";
  } else if (network === "tenderlyArbitrum") {
    chainName = "arbitrum";
  } else {
    console.log("❌ This script is for Tenderly networks only");
    console.log("Use: npx hardhat run scripts/tenderly-deploy.js --network tenderlyMainnet");
    return;
  }
  
  const protocols = MAINNET_PROTOCOLS[chainName];
  const chainConfig = CHAIN_CONFIG[chainName];
  
  console.log("========================================");
  console.log(`Deploying on Tenderly ${chainName.toUpperCase()} Fork`);
  console.log("========================================\n");
  console.log("Network:", network);
  console.log("Chain:", chainName);
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.1")) {
    console.log("\n⚠️  Low ETH balance detected!");
    console.log("Please fund your account using Tenderly's admin_setBalance RPC method");
    console.log("Or use the Tenderly dashboard to add ETH to:", deployer.address);
    console.log("\nTrying to request ETH from faucet...");
    
    // Try to set balance using Tenderly's admin RPC (if available)
    try {
      await ethers.provider.send("tenderly_setBalance", [
        [deployer.address],
        ethers.toQuantity(ethers.parseEther("10"))
      ]);
      const newBalance = await ethers.provider.getBalance(deployer.address);
      console.log("✅ Balance updated:", ethers.formatEther(newBalance), "ETH");
    } catch (e) {
      console.log("❌ Could not auto-fund. Please manually add ETH via Tenderly dashboard");
      return;
    }
  }
  
  // Deploy UnifiedRouter
  console.log("\n📦 Deploying UnifiedRouter...");
  const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
  const routerDeploy = await UnifiedRouter.deploy(deployer.address);
  await routerDeploy.waitForDeployment();
  const routerAddress = await routerDeploy.getAddress();
  console.log("✅ UnifiedRouter deployed at:", routerAddress);
  
  // Get contract instance with proper ABI
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  
  // Configure protocols
  console.log("\n⚙️ Configuring protocols...");
  
  // CCTP
  if (protocols.CCTP_TOKEN_MESSENGER !== "0x0000000000000000000000000000000000000000") {
    const tx1 = await router.setProtocolContract(1, protocols.CCTP_TOKEN_MESSENGER); // CCTP
    await tx1.wait();
    console.log("✅ CCTP configured");
    
    const tx2 = await router.setProtocolContract(2, protocols.CCTP_MESSAGE_TRANSMITTER); // CCTP_HOOKS
    await tx2.wait();
    console.log("✅ CCTP Hooks configured");
  }
  
  // LayerZero
  if (protocols.LAYERZERO_ENDPOINT !== "0x0000000000000000000000000000000000000000") {
    const tx3 = await router.setProtocolContract(3, protocols.LAYERZERO_ENDPOINT); // LAYERZERO
    await tx3.wait();
    console.log("✅ LayerZero configured");
  }
  
  // Stargate
  if (protocols.STARGATE_ROUTER !== "0x0000000000000000000000000000000000000000") {
    const tx4 = await router.setProtocolContract(4, protocols.STARGATE_ROUTER); // STARGATE
    await tx4.wait();
    console.log("✅ Stargate configured");
  }
  
  // Deploy CCTPHookReceiver for cross-token swaps
  console.log("\n📦 Deploying CCTPHookReceiver...");
  const CCTPHookReceiver = await ethers.getContractFactory("CCTPHookReceiver");
  
  // Deploy SwapExecutor first (or use mock)
  console.log("📦 Deploying MockSwapExecutor...");
  const MockSwapExecutor = await ethers.getContractFactory("MockSwapExecutor");
  const swapExecutor = await MockSwapExecutor.deploy();
  await swapExecutor.waitForDeployment();
  const swapExecutorAddress = await swapExecutor.getAddress();
  console.log("✅ MockSwapExecutor deployed at:", swapExecutorAddress);
  
  const hookReceiver = await CCTPHookReceiver.deploy(
    swapExecutorAddress,
    protocols.CCTP_MESSAGE_TRANSMITTER,
    protocols.USDC
  );
  await hookReceiver.waitForDeployment();
  const hookReceiverAddress = await hookReceiver.getAddress();
  console.log("✅ CCTPHookReceiver deployed at:", hookReceiverAddress);
  
  // Configure hook receiver in router
  const tx5 = await router.setCCTPHookReceiver(chainConfig.chainId, hookReceiverAddress);
  await tx5.wait();
  console.log("✅ Hook receiver configured in router");
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    chain: chainName,
    chainId: chainConfig.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      UnifiedRouter: routerAddress,
      CCTPHookReceiver: hookReceiverAddress,
      MockSwapExecutor: swapExecutorAddress
    },
    protocols: protocols,
    chainConfig: chainConfig
  };
  
  const deploymentPath = `./deployments/tenderly-${chainName}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment saved to ${deploymentPath}`);
  
  console.log("\n========================================");
  console.log("✅ Deployment Complete!");
  console.log("========================================");
  console.log("\nNext steps:");
  console.log("1. Update .env with Tenderly RPC URLs");
  console.log("2. Run configure-tenderly-routes.js to set up routes");
  console.log("3. Test cross-chain transfers with real mainnet tokens");
  
  // Display some useful token balances
  console.log("\n📊 Token Information:");
  for (const [symbol, address] of Object.entries(protocols)) {
    if (symbol.includes("USDC") || symbol.includes("USDT") || symbol.includes("DAI") || symbol.includes("PYUSD") || symbol.includes("USDe")) {
      if (address !== "0x0000000000000000000000000000000000000000") {
        try {
          const token = await ethers.getContractAt("IERC20", address);
          const balance = await token.balanceOf(deployer.address);
          console.log(`${symbol}: ${address}`);
          if (balance > 0n) {
            const decimals = await token.decimals();
            console.log(`  Balance: ${ethers.formatUnits(balance, decimals)}`);
          }
        } catch (e) {
          // Token might not exist
        }
      }
    }
  }
}

async function main() {
  await deployOnTenderly();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 ARBITRUM ONE MAINNET DEPLOYMENT");
  console.log("==================================\n");
  
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (chainId !== 42161) {
    throw new Error("This script is for Arbitrum One only (42161)");
  }
  
  // Arbitrum One mainnet configuration
  const networkConfig = {
    name: "Arbitrum One",
    chainId: 42161,
    cctp: {
      tokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
      messageTransmitter: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca"
    },
    uniswap: {
      router: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    layerzero: {
      endpoint: "0x1a44076050125825900e736c501f859c50fE728c"
    },
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  };
  
  const [deployer] = await ethers.getSigners();
  
  console.log("📋 DEPLOYMENT CONFIGURATION REVIEW");
  console.log("===================================");
  console.log(`📍 Network: ${networkConfig.name} (${chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 ETH Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))}`);
  console.log("");
  
  console.log("🔧 Protocol Addresses to Configure:");
  console.log(`🔵 CCTP TokenMessenger: ${networkConfig.cctp.tokenMessenger}`);
  console.log(`📡 CCTP MessageTransmitter: ${networkConfig.cctp.messageTransmitter}`);
  console.log(`🦄 Uniswap V3 Router: ${networkConfig.uniswap.router}`);
  console.log(`🌐 LayerZero Endpoint: ${networkConfig.layerzero.endpoint}`);
  console.log(`💰 USDC Token: ${networkConfig.usdc}`);
  console.log("");
  
  console.log("📊 Deployment Plan:");
  console.log("1. Deploy SwapExecutor with Uniswap V3 Router");
  console.log("2. Deploy UnifiedRouter with deployer as owner");
  console.log("3. Configure CCTP protocol (enum value 1)");
  console.log("4. Configure LayerZero protocol (enum value 3)");
  console.log("5. Verify contracts on Arbiscan");
  console.log("");
  
  // Check if we have enough ETH
  const balance = await ethers.provider.getBalance(deployer.address);
  const minimumRequired = ethers.parseEther("0.001"); // 0.001 ETH
  
  if (balance < minimumRequired) {
    console.log("❌ INSUFFICIENT FUNDS");
    console.log(`   Current: ${ethers.formatEther(balance)} ETH`);
    console.log(`   Required: ${ethers.formatEther(minimumRequired)} ETH`);
    console.log("");
    console.log("💡 Please fund the deployer address before proceeding:");
    console.log(`   Address: ${deployer.address}`);
    console.log(`   Network: Arbitrum One (42161)`);
    console.log(`   Required: ~0.001 ETH for deployment`);
    return;
  }
  
  console.log("✅ SUFFICIENT FUNDS - READY TO DEPLOY");
  console.log(`   Available: ${ethers.formatEther(balance)} ETH`);
  console.log("");
  
  // Estimate gas costs
  console.log("⛽ Estimating Deployment Costs...");
  try {
    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    const UnifiedRouter = await ethers.getContractFactory("UnifiedRouter");
    
    // Estimate SwapExecutor deployment
    const swapExecutorDeployTx = SwapExecutor.getDeployTransaction(networkConfig.uniswap.router);
    const swapExecutorGas = await ethers.provider.estimateGas(swapExecutorDeployTx);
    
    // Estimate UnifiedRouter deployment (using a dummy address for estimation)
    const routerDeployTx = UnifiedRouter.getDeployTransaction(deployer.address);
    const routerGas = await ethers.provider.estimateGas(routerDeployTx);
    
    const gasPrice = (await ethers.provider.getFeeData()).gasPrice;
    const totalGas = swapExecutorGas + routerGas + BigInt(200000); // +200k for configurations
    const estimatedCost = totalGas * gasPrice;
    
    console.log(`   SwapExecutor Gas: ${swapExecutorGas.toString()}`);
    console.log(`   UnifiedRouter Gas: ${routerGas.toString()}`);
    console.log(`   Configuration Gas: ~200,000`);
    console.log(`   Total Estimated Gas: ${totalGas.toString()}`);
    console.log(`   Gas Price: ${ethers.formatGwei(gasPrice)} gwei`);
    console.log(`   Estimated Cost: ${ethers.formatEther(estimatedCost)} ETH`);
    
    if (balance < estimatedCost * BigInt(2)) { // 2x buffer
      console.log("⚠️  WARNING: Balance is close to estimated cost");
      console.log("   Consider adding more ETH for safety");
    } else {
      console.log("✅ Sufficient balance for deployment");
    }
  } catch (e) {
    console.log("⚠️  Could not estimate gas costs:", e.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🎯 READY FOR ARBITRUM ONE DEPLOYMENT");
  console.log("=".repeat(60));
  console.log("");
  console.log("📋 What will be deployed:");
  console.log(`   • SwapExecutor: Uniswap V3 integration`);
  console.log(`   • UnifiedRouter: Main cross-chain router`);
  console.log(`   • Owner: ${deployer.address}`);
  console.log("");
  console.log("🔧 What will be configured:");
  console.log(`   • CCTP Protocol: ${networkConfig.cctp.tokenMessenger}`);
  console.log(`   • LayerZero Protocol: ${networkConfig.layerzero.endpoint}`);
  console.log("");
  console.log("🔍 Verification:");
  console.log("   • Both contracts will be verified on Arbiscan");
  console.log("   • Source code will be published");
  console.log("");
  
  console.log("✅ Configuration validated and ready!");
  console.log("💡 To proceed with deployment, confirm these values are correct.");
  console.log("");
  console.log("🚀 Next step: Run deployment with sufficient ETH balance");
  
  // Save the configuration for reference
  const deploymentConfig = {
    network: networkConfig.name,
    chainId: chainId,
    deployer: deployer.address,
    balance: ethers.formatEther(balance),
    contracts: {
      swapExecutor: {
        constructor: [networkConfig.uniswap.router],
        description: "Uniswap V3 swap executor"
      },
      unifiedRouter: {
        constructor: [deployer.address],
        description: "Main cross-chain router with correct owner"
      }
    },
    protocols: {
      cctp: {
        id: 1,
        address: networkConfig.cctp.tokenMessenger,
        description: "Circle CCTP TokenMessenger"
      },
      layerzero: {
        id: 3,
        address: networkConfig.layerzero.endpoint,
        description: "LayerZero V2 Endpoint"
      }
    },
    verification: {
      explorer: "Arbiscan",
      baseUrl: "https://arbiscan.io"
    },
    preparedAt: new Date().toISOString()
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const configPath = path.join(deploymentsDir, 'arbitrum_deployment_config.json');
  fs.writeFileSync(configPath, JSON.stringify(deploymentConfig, null, 2));
  console.log(`📄 Configuration saved: ${configPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
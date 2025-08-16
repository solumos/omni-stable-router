const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting Contract Verification...\n");
  
  const network = hre.network.name;
  const deploymentPath = path.join(__dirname, `../deployments/${network}-deployment.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ No deployment found for ${network}`);
    console.error(`   Run 'npm run deploy:${network}' first`);
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log(`Network: ${network}`);
  console.log(`Chain ID: ${deployment.chainId}\n`);
  
  const contracts = [
    {
      name: "TimelockMultisig",
      address: deployment.contracts.timelock,
      constructorArgs: [
        2 * 24 * 60 * 60, // 2 days
        deployment.multisig.proposers,
        deployment.multisig.executors,
        ethers.constants.AddressZero
      ]
    },
    {
      name: "SwapExecutor",
      address: deployment.contracts.swapExecutor,
      constructorArgs: [deployment.externalContracts.uniswapV3Router]
    },
    {
      name: "FeeManager",
      address: deployment.contracts.feeManager,
      constructorArgs: [deployment.deployer]
    },
    {
      name: "CCTPHookReceiver",
      address: deployment.contracts.hookReceiver,
      constructorArgs: [
        deployment.contracts.swapExecutor,
        deployment.externalContracts.cctpMessageTransmitter,
        deployment.externalContracts.usdc
      ]
    }
  ];
  
  // Note: Proxy contracts need special handling
  const proxyContracts = [
    {
      name: "RouteProcessor",
      address: deployment.contracts.routeProcessor,
      type: "proxy"
    },
    {
      name: "StableRouter",
      address: deployment.contracts.stableRouter,
      type: "proxy"
    }
  ];
  
  console.log("Verifying regular contracts...\n");
  
  for (const contract of contracts) {
    console.log(`📝 Verifying ${contract.name}...`);
    
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArgs,
      });
      console.log(`✅ ${contract.name} verified!\n`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✓ ${contract.name} already verified\n`);
      } else {
        console.error(`❌ Failed to verify ${contract.name}:`, error.message, "\n");
      }
    }
  }
  
  console.log("Verifying proxy contracts...\n");
  
  for (const contract of proxyContracts) {
    console.log(`📝 Verifying ${contract.name} (UUPS Proxy)...`);
    
    try {
      // For upgradeable contracts, we need to verify the implementation
      const implAddress = await hre.upgrades.erc1967.getImplementationAddress(contract.address);
      console.log(`   Implementation: ${implAddress}`);
      
      await hre.run("verify:verify", {
        address: implAddress,
        constructorArguments: [],
      });
      console.log(`✅ ${contract.name} implementation verified!\n`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✓ ${contract.name} already verified\n`);
      } else {
        console.error(`❌ Failed to verify ${contract.name}:`, error.message, "\n");
      }
    }
  }
  
  console.log("=====================================");
  console.log("✅ Verification complete!");
  console.log("=====================================\n");
  
  // Generate Etherscan links
  const explorer = getExplorerUrl(network);
  console.log("📋 Contract Links:\n");
  
  for (const contract of contracts) {
    console.log(`${contract.name}:`);
    console.log(`   ${explorer}/address/${contract.address}#code\n`);
  }
  
  for (const contract of proxyContracts) {
    console.log(`${contract.name} (Proxy):`);
    console.log(`   ${explorer}/address/${contract.address}#code\n`);
  }
}

function getExplorerUrl(network) {
  const explorers = {
    sepolia: "https://sepolia.etherscan.io",
    arbitrumSepolia: "https://sepolia.arbiscan.io",
    baseSepolia: "https://sepolia.basescan.org",
    avalancheFuji: "https://testnet.snowtrace.io"
  };
  
  return explorers[network] || "https://etherscan.io";
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
const { ethers } = require("hardhat");

// OFT addresses for each token on each chain
const OFT_ADDRESSES = {
  // PYUSD
  PYUSD: {
    1: "0xa2c323fe5a74adffad2bf3e007e36bb029606444",     // Ethereum - OFT Adapter
    10: "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4",    // Optimism - Native OFT
  },
  
  // USDe
  USDe: {
    1: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3",     // Ethereum - Need to verify adapter
    42161: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",  // Arbitrum - Native OFT
    8453: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",   // Base - Native OFT
  },
  
  // crvUSD
  crvUSD: {
    1: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E",     // Ethereum - Need to verify adapter
    42161: "0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5",  // Arbitrum - Native OFT
    10: "0x061b87122Ed14b9526A813209C8a59a633257bAb",     // Optimism - Native OFT
    8453: "0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93",   // Base - Native OFT
  }
};

// Token addresses on source chain (Ethereum)
const TOKEN_ADDRESSES = {
  PYUSD: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
  USDe: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3",
  crvUSD: "0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E"
};

async function main() {
  const network = hre.network.name;
  const deploymentPath = `./deployments/${network}.json`;
  
  const fs = require("fs");
  if (!fs.existsSync(deploymentPath)) {
    console.error(`No deployment found for network: ${network}`);
    return;
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const routeProcessor = await ethers.getContractAt(
    "RouteProcessor",
    deployment.contracts.RouteProcessor
  );
  
  console.log(`Configuring OFT addresses for ${network}...`);
  
  // Configure destination OFT addresses for each token
  for (const [tokenName, tokenAddress] of Object.entries(TOKEN_ADDRESSES)) {
    const oftAddresses = OFT_ADDRESSES[tokenName];
    
    for (const [chainId, oftAddress] of Object.entries(oftAddresses)) {
      // Skip current chain
      if (Number(chainId) === deployment.chainId) {
        continue;
      }
      
      console.log(`Setting ${tokenName} OFT on chain ${chainId}: ${oftAddress}`);
      
      try {
        const tx = await routeProcessor.setDestinationOFTAddress(
          Number(chainId),
          tokenAddress,
          oftAddress
        );
        await tx.wait();
        console.log(`  ✓ Transaction: ${tx.hash}`);
      } catch (error) {
        console.log(`  ✗ Failed: ${error.message}`);
      }
    }
  }
  
  console.log("\n=== OFT Address Configuration Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
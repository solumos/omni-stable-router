const { ethers } = require("hardhat");

// Contract addresses
const CONTRACTS = {
  sepolia: {
    routeProcessor: "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  },
  baseSepolia: {
    routeProcessor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  arbitrumSepolia: {
    routeProcessor: "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  }
};

async function main() {
  const network = hre.network.name;
  console.log(`\n⚙️  Configuring USDC on ${network}\n`);
  
  if (!CONTRACTS[network]) {
    console.log("❌ No contracts deployed on this network");
    return;
  }
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Signer:", signer.address);
  
  const routeProcessor = await ethers.getContractAt("RouteProcessor", CONTRACTS[network].routeProcessor);
  
  // Check ownership
  const owner = await routeProcessor.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("❌ You are not the owner");
    return;
  }
  
  console.log("✅ You are the owner\n");
  
  // Configure USDC
  console.log("Configuring USDC as CCTP token...");
  const tx = await routeProcessor.configureToken(
    CONTRACTS[network].usdc,
    true,  // isUSDC = true
    ethers.ZeroAddress,  // no OFT adapter
    0  // no Stargate pool
  );
  
  console.log("📤 Transaction sent:", tx.hash);
  await tx.wait();
  
  console.log("✅ USDC configured successfully!");
  console.log("\nYou can now run CCTP transfers from this network.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
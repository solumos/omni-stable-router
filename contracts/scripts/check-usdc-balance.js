const { ethers } = require("hardhat");
const { formatUnits } = require("ethers");

const USDC_ADDRESSES = {
  sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
};

async function main() {
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Checking USDC Balance");
  console.log("========================");
  console.log("Network:", network);
  console.log("Address:", signer.address);
  
  if (!USDC_ADDRESSES[network]) {
    console.log("❌ No USDC address configured for this network");
    return;
  }
  
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESSES[network]);
  
  // Get balance
  const balance = await usdc.balanceOf(signer.address);
  console.log("\n💰 USDC Balance:", formatUnits(balance, 6), "USDC");
  
  // Get total supply to verify burns
  try {
    const totalSupply = await usdc.totalSupply();
    console.log("📊 Total Supply:", formatUnits(totalSupply, 6), "USDC");
  } catch (e) {
    // Some USDC contracts might not expose totalSupply
  }
  
  // Check recent transfer events
  console.log("\n📜 Checking recent activity...");
  
  // Get the last few blocks
  const currentBlock = await ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 100; // Last 100 blocks
  
  // Create filter for Transfer events involving our address
  const filterFrom = usdc.filters.Transfer(signer.address, null);
  const filterTo = usdc.filters.Transfer(null, signer.address);
  
  try {
    const sentEvents = await usdc.queryFilter(filterFrom, fromBlock, currentBlock);
    const receivedEvents = await usdc.queryFilter(filterTo, fromBlock, currentBlock);
    
    if (sentEvents.length > 0) {
      console.log("\n📤 Recent Sends:");
      for (const event of sentEvents.slice(-5)) { // Last 5 sends
        console.log(`  Block ${event.blockNumber}: ${formatUnits(event.args.value, 6)} USDC to ${event.args.to.slice(0, 10)}...`);
      }
    }
    
    if (receivedEvents.length > 0) {
      console.log("\n📥 Recent Receives:");
      for (const event of receivedEvents.slice(-5)) { // Last 5 receives
        console.log(`  Block ${event.blockNumber}: ${formatUnits(event.args.value, 6)} USDC from ${event.args.from.slice(0, 10)}...`);
      }
    }
    
    if (sentEvents.length === 0 && receivedEvents.length === 0) {
      console.log("No recent transfer activity in the last 100 blocks");
    }
  } catch (e) {
    console.log("Could not query events:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
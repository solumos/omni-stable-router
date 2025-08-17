const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

async function testDirectCCTP() {
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Testing Direct CCTP Call");
  console.log("============================");
  console.log("Network:", hre.network.name);
  console.log("Signer:", signer.address);
  
  // CCTP contracts on Base
  const TOKEN_MESSENGER = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Get TokenMessenger contract
  const tokenMessengerAbi = [
    "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)",
    "function localMinter() external view returns (address)",
    "event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)"
  ];
  
  const tokenMessenger = new ethers.Contract(TOKEN_MESSENGER, tokenMessengerAbi, signer);
  
  // Check USDC balance
  const usdc = await ethers.getContractAt("IERC20", USDC);
  const balance = await usdc.balanceOf(signer.address);
  console.log("\nUSDC Balance:", formatUnits(balance, 6));
  
  if (balance == 0n) {
    console.log("❌ No USDC balance");
    return;
  }
  
  const amount = parseUnits("1", 6); // 1 USDC
  
  // Approve TokenMessenger
  console.log("\n1️⃣ Approving TokenMessenger...");
  const approveTx = await usdc.approve(TOKEN_MESSENGER, amount);
  await approveTx.wait();
  console.log("✅ Approved");
  
  // Try to call depositForBurn directly
  console.log("\n2️⃣ Calling depositForBurn...");
  
  const destinationDomain = 3; // Arbitrum domain
  const mintRecipient = ethers.zeroPadValue(signer.address, 32);
  
  try {
    // First try to estimate gas
    const estimatedGas = await tokenMessenger.depositForBurn.estimateGas(
      amount,
      destinationDomain,
      mintRecipient,
      USDC
    );
    console.log("Estimated gas:", estimatedGas.toString());
    
    const tx = await tokenMessenger.depositForBurn(
      amount,
      destinationDomain,
      mintRecipient,
      USDC,
      { gasLimit: estimatedGas * 2n }
    );
    
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ CCTP depositForBurn successful!");
    
    // Parse events
    for (const log of receipt.logs) {
      try {
        const parsed = tokenMessenger.interface.parseLog(log);
        if (parsed && parsed.name === "DepositForBurn") {
          console.log("\n📋 DepositForBurn Event:");
          console.log("  Nonce:", parsed.args.nonce);
          console.log("  Amount:", formatUnits(parsed.args.amount, 6), "USDC");
          console.log("  Destination Domain:", parsed.args.destinationDomain);
        }
      } catch (e) {
        // Other events
      }
    }
    
  } catch (error) {
    console.error("❌ Direct CCTP call failed:", error.message);
    
    // Try to get more details
    if (error.data) {
      console.log("Error data:", error.data);
    }
    if (error.reason) {
      console.log("Error reason:", error.reason);
    }
  }
}

async function main() {
  await testDirectCCTP();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
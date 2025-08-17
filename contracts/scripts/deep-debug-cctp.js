const { ethers } = require("hardhat");
const { formatUnits, parseUnits } = require("ethers");

async function deepDebugCCTP() {
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Deep CCTP Debug");
  console.log("==================");
  console.log("Network:", hre.network.name);
  console.log("Signer:", signer.address);
  
  const routerAddress = "0x8ABdaF7CABc7dAe57866aCa5C35Ef06BE6E15850";
  const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const TOKEN_MESSENGER = "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962";
  
  // Get contracts
  const router = await ethers.getContractAt("UnifiedRouter", routerAddress);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  
  // Get TokenMessenger ABI for more detailed checks
  const tokenMessengerAbi = [
    "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)",
    "function localMinter() external view returns (address)",
    "function messageBodyVersion() external view returns (uint32)",
    "function localMessageTransmitter() external view returns (address)",
    "event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)"
  ];
  
  const tokenMessenger = new ethers.Contract(TOKEN_MESSENGER, tokenMessengerAbi, signer);
  
  console.log("\n📋 CCTP Configuration:");
  console.log("======================");
  
  // Check TokenMessenger configuration
  try {
    const localMinter = await tokenMessenger.localMinter();
    console.log("Local Minter:", localMinter);
    
    const messageTransmitter = await tokenMessenger.localMessageTransmitter();
    console.log("Message Transmitter:", messageTransmitter);
    
    const version = await tokenMessenger.messageBodyVersion();
    console.log("Message Body Version:", version);
  } catch (error) {
    console.log("❌ Error reading TokenMessenger config:", error.message);
  }
  
  // Check if USDC is burnable by TokenMessenger
  console.log("\n🔥 USDC Burn Permissions:");
  console.log("========================");
  
  // Get TokenMinter contract to check burn limits
  const tokenMinterAbi = [
    "function burnLimitsPerMessage(address token) external view returns (uint256)",
    "function getLocalToken() external view returns (address)",
    "function paused() external view returns (bool)"
  ];
  
  try {
    const localMinter = await tokenMessenger.localMinter();
    const tokenMinter = new ethers.Contract(localMinter, tokenMinterAbi, signer);
    
    const burnLimit = await tokenMinter.burnLimitsPerMessage(USDC);
    console.log("Burn limit per message:", formatUnits(burnLimit, 6), "USDC");
    
    const isPaused = await tokenMinter.paused();
    console.log("TokenMinter paused:", isPaused);
    
    const localToken = await tokenMinter.getLocalToken();
    console.log("Local token:", localToken);
    console.log("USDC address:", USDC);
    console.log("Tokens match:", localToken.toLowerCase() === USDC.toLowerCase());
  } catch (error) {
    console.log("❌ Error checking TokenMinter:", error.message);
  }
  
  // Now let's trace exactly what our router is doing
  console.log("\n🔄 Router Execution Trace:");
  console.log("==========================");
  
  const amount = parseUnits("1", 6);
  
  // First approve both router and token messenger
  console.log("1. Approving contracts...");
  await (await usdc.approve(routerAddress, amount)).wait();
  await (await usdc.approve(TOKEN_MESSENGER, amount)).wait();
  console.log("   ✅ Approved both router and TokenMessenger");
  
  // Check balances and allowances
  const balance = await usdc.balanceOf(signer.address);
  const routerAllowance = await usdc.allowance(signer.address, routerAddress);
  const messengerAllowance = await usdc.allowance(signer.address, TOKEN_MESSENGER);
  
  console.log("\n2. Pre-transfer state:");
  console.log("   Balance:", formatUnits(balance, 6), "USDC");
  console.log("   Router allowance:", formatUnits(routerAllowance, 6), "USDC");
  console.log("   Messenger allowance:", formatUnits(messengerAllowance, 6), "USDC");
  
  // Try to simulate what the router does step by step
  console.log("\n3. Simulating router's CCTP execution:");
  
  // First, let's see if the router can transfer USDC from us
  console.log("   a. Testing USDC transfer to router...");
  try {
    // Get USDC balance of router before
    const routerBalanceBefore = await usdc.balanceOf(routerAddress);
    console.log("      Router USDC before:", formatUnits(routerBalanceBefore, 6));
    
    // The router should transfer USDC from sender
    const transferData = usdc.interface.encodeFunctionData("transferFrom", [
      signer.address,
      routerAddress,
      amount
    ]);
    
    const result = await signer.call({
      to: USDC,
      data: transferData
    });
    console.log("      ✅ TransferFrom simulation successful");
  } catch (error) {
    console.log("      ❌ TransferFrom failed:", error.message);
  }
  
  // Now test if router can approve TokenMessenger
  console.log("   b. Testing router's approval to TokenMessenger...");
  try {
    // Check current allowance from router to messenger
    const currentAllowance = await usdc.allowance(routerAddress, TOKEN_MESSENGER);
    console.log("      Current allowance:", formatUnits(currentAllowance, 6));
  } catch (error) {
    console.log("      ❌ Error checking allowance:", error.message);
  }
  
  // Now let's try the actual router transfer with detailed error catching
  console.log("\n4. Executing router transfer:");
  
  try {
    // Build the transaction manually to see what's being sent
    const iface = router.interface;
    const calldata = iface.encodeFunctionData("transfer", [
      USDC,                                           // fromToken
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  // toToken (USDC on Arbitrum)
      amount,                                         // amount
      9924,                                          // toChainId (Arbitrum)
      signer.address                                  // recipient
    ]);
    
    console.log("   Calldata:", calldata);
    console.log("   Calldata length:", calldata.length);
    
    // Try to trace the call
    console.log("\n5. Attempting transaction:");
    const tx = await signer.sendTransaction({
      to: routerAddress,
      data: calldata,
      gasLimit: 500000
    });
    
    console.log("   TX Hash:", tx.hash);
    const receipt = await tx.wait();
    
    if (receipt.status === 0) {
      console.log("   ❌ Transaction reverted");
      console.log("   Gas used:", receipt.gasUsed.toString());
    } else {
      console.log("   ✅ Transaction successful!");
      console.log("   Gas used:", receipt.gasUsed.toString());
      
      // Parse events
      for (const log of receipt.logs) {
        try {
          const parsed = router.interface.parseLog(log);
          if (parsed) {
            console.log("   Event:", parsed.name);
          }
        } catch (e) {
          // Try TokenMessenger events
          try {
            const parsed = tokenMessenger.interface.parseLog(log);
            if (parsed) {
              console.log("   TokenMessenger Event:", parsed.name);
            }
          } catch (e2) {
            // Other contract
          }
        }
      }
    }
    
  } catch (error) {
    console.log("   ❌ Transaction failed:", error.message);
    
    // Try to get more details about the revert
    if (error.data) {
      console.log("   Error data:", error.data);
      
      // Try to decode as a custom error
      try {
        const decoded = router.interface.parseError(error.data);
        console.log("   Decoded error:", decoded);
      } catch (e) {
        // Not a router error, might be from USDC or TokenMessenger
        console.log("   Raw revert data:", error.data);
      }
    }
    
    if (error.receipt) {
      console.log("   Receipt status:", error.receipt.status);
      console.log("   Gas used:", error.receipt.gasUsed?.toString());
    }
  }
  
  // Check final state
  console.log("\n6. Post-execution state:");
  const finalBalance = await usdc.balanceOf(signer.address);
  const routerBalance = await usdc.balanceOf(routerAddress);
  console.log("   User balance:", formatUnits(finalBalance, 6), "USDC");
  console.log("   Router balance:", formatUnits(routerBalance, 6), "USDC");
  console.log("   USDC transferred:", formatUnits(balance - finalBalance, 6));
}

async function main() {
  await deepDebugCCTP();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
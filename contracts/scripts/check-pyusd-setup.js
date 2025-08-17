const { ethers } = require("hardhat");
const { formatUnits } = require("ethers");

const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";

// LayerZero OFT interface check
const OFT_INTERFACE = [
  "function sendFrom(address _from, uint16 _dstChainId, bytes calldata _toAddress, uint256 _amount, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable",
  "function token() external view returns (address)",
  "function sharedDecimals() external view returns (uint8)",
  "function estimateSendFee(uint16 _dstChainId, bytes calldata _toAddress, uint256 _amount, bool _useZro, bytes calldata _adapterParams) external view returns (uint256 nativeFee, uint256 zroFee)"
];

async function checkPYUSD() {
  console.log("🔍 Checking PYUSD Setup on Sepolia\n");
  console.log("=====================================\n");
  
  const [signer] = await ethers.getSigners();
  console.log("👤 Your address:", signer.address);
  
  // Get PYUSD contract
  const pyusd = await ethers.getContractAt("IERC20", PYUSD_ADDRESS);
  
  // Check basic token info
  console.log("\n📋 PYUSD Token Info:");
  console.log("Address:", PYUSD_ADDRESS);
  
  try {
    const name = await pyusd.name();
    const symbol = await pyusd.symbol();
    const decimals = await pyusd.decimals();
    const totalSupply = await pyusd.totalSupply();
    
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Total Supply:", formatUnits(totalSupply, decimals));
  } catch (e) {
    console.log("Error getting token info:", e.message);
  }
  
  // Check your balance
  const balance = await pyusd.balanceOf(signer.address);
  console.log("\n💰 Your PYUSD Balance:", formatUnits(balance, 6), "PYUSD");
  
  if (balance == 0n) {
    console.log("\n📝 To get PYUSD on Sepolia:");
    console.log("1. Check if there's a faucet: https://www.paypal.com/us/digital-wallet/manage-money/crypto/pyusd");
    console.log("2. Or swap USDC for PYUSD on a testnet DEX");
  }
  
  // Check if PYUSD is an OFT
  console.log("\n🔍 Checking if PYUSD is an OFT...");
  
  try {
    // Try to create OFT interface
    const oftContract = new ethers.Contract(PYUSD_ADDRESS, OFT_INTERFACE, signer);
    
    // Try to call OFT-specific function
    const sharedDecimals = await oftContract.sharedDecimals();
    console.log("✅ PYUSD appears to be an OFT!");
    console.log("Shared decimals:", sharedDecimals);
    
    // Estimate fee to Base Sepolia
    const BASE_SEPOLIA_LZ_ID = 10245;
    const testAmount = ethers.parseUnits("1", 6);
    const adapterParams = ethers.solidityPacked(["uint16", "uint256"], [1, 200000]);
    
    try {
      const [nativeFee, zroFee] = await oftContract.estimateSendFee(
        BASE_SEPOLIA_LZ_ID,
        ethers.zeroPadValue(signer.address, 32),
        testAmount,
        false,
        adapterParams
      );
      console.log("\n💸 LayerZero Fee Estimate (to Base Sepolia):");
      console.log("Native fee:", formatUnits(nativeFee, 18), "ETH");
      console.log("ZRO fee:", formatUnits(zroFee, 18), "ZRO");
    } catch (e) {
      console.log("Could not estimate fees:", e.message);
    }
    
  } catch (e) {
    console.log("❌ PYUSD does not appear to be an OFT");
    console.log("It might need an OFT adapter/wrapper");
    
    // Check for known OFT adapters
    console.log("\n🔍 Checking for OFT adapters...");
    
    // Common OFT adapter patterns
    const possibleAdapters = [
      PYUSD_ADDRESS.slice(0, -4) + "0FT", // Common naming pattern
      // Add other known adapter addresses
    ];
    
    console.log("Possible adapter addresses to check:");
    possibleAdapters.forEach(addr => console.log("•", addr));
    
    console.log("\n💡 If PYUSD is not an OFT, you'll need:");
    console.log("1. Deploy an OFT adapter contract");
    console.log("2. Or use a different approach (wrap PYUSD in an OFT-compatible token)");
  }
  
  // Check RouteProcessor configuration
  console.log("\n🔧 Checking RouteProcessor Configuration:");
  const routeProcessor = await ethers.getContractAt(
    "RouteProcessor",
    "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de"
  );
  
  const oftAddress = await routeProcessor.tokenToOFT(PYUSD_ADDRESS);
  if (oftAddress === ethers.ZeroAddress) {
    console.log("❌ PYUSD not configured in RouteProcessor");
    console.log("Need to call: routeProcessor.configureToken()");
  } else {
    console.log("✅ PYUSD OFT configured in RouteProcessor:", oftAddress);
  }
  
  // Check if we can use CCTP instead (if PYUSD can be swapped to USDC on source)
  console.log("\n💡 Alternative Approach:");
  console.log("If PYUSD is not OFT-enabled, consider:");
  console.log("1. Swap PYUSD → USDC on Sepolia");
  console.log("2. Use CCTP to bridge USDC to Base Sepolia");
  console.log("3. Swap USDC → desired token on Base Sepolia");
}

async function main() {
  await checkPYUSD();
  
  console.log("\n=====================================");
  console.log("📝 Summary:");
  console.log("• PYUSD address confirmed: " + PYUSD_ADDRESS);
  console.log("• Check if it's OFT-enabled above");
  console.log("• If not OFT, need adapter or alternative approach");
  console.log("• LayerZero Composer requires OFT tokens");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
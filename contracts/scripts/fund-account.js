const { ethers } = require("hardhat");

async function main() {
  const recipient = "0xFC825D166f219ea5Aa75d993609eae546E013cEE";
  
  console.log("========================================");
  console.log("🐋 Funding Account with Tokens");
  console.log("========================================\n");
  console.log("Recipient:", recipient);
  
  // Base mainnet token addresses
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const USDe_ADDRESS = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34";
  
  // Known whale addresses on Base mainnet
  // These are some of the largest USDC holders on Base
  const USDC_WHALE = "0x20FE51A9229EEf2cF8Ad9E89d91CAb9312cF3b7A"; // Large USDC holder
  const USDe_WHALE = "0x0B0A5886664376F59C351ba3f598C8A8B4D51B80"; // USDe holder
  
  // First, send some ETH for gas
  console.log("\n1️⃣ Sending ETH for gas...");
  const [signer] = await ethers.getSigners();
  const ethTx = await signer.sendTransaction({
    to: recipient,
    value: ethers.parseEther("10")
  });
  await ethTx.wait();
  console.log("✅ Sent 10 ETH for gas");
  
  // Impersonate USDC whale
  console.log("\n2️⃣ Impersonating USDC whale...");
  await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
  const usdcWhaleSigner = await ethers.provider.getSigner(USDC_WHALE);
  
  // Fund the whale with ETH for gas
  const fundWhale1 = await signer.sendTransaction({
    to: USDC_WHALE,
    value: ethers.parseEther("1")
  });
  await fundWhale1.wait();
  
  // Get USDC contract
  const usdcContract = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)",
     "function transfer(address to, uint256 amount) returns (bool)"],
    USDC_ADDRESS
  );
  
  // Check whale balance
  const usdcWhaleBalance = await usdcContract.balanceOf(USDC_WHALE);
  console.log("🐋 USDC Whale balance:", ethers.formatUnits(usdcWhaleBalance, 6), "USDC");
  
  // Send USDC to recipient using the impersonated account
  const usdcAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  if (usdcWhaleBalance >= usdcAmount) {
    const usdcTx = await usdcContract.connect(usdcWhaleSigner).transfer(recipient, usdcAmount);
    await usdcTx.wait();
    console.log("✅ Sent 10,000 USDC to", recipient);
  } else {
    console.log("⚠️ Whale doesn't have enough USDC, sending available amount");
    const usdcTx = await usdcContract.connect(usdcWhaleSigner).transfer(recipient, usdcWhaleBalance);
    await usdcTx.wait();
    console.log("✅ Sent", ethers.formatUnits(usdcWhaleBalance, 6), "USDC to", recipient);
  }
  
  // Stop impersonating USDC whale
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDC_WHALE]);
  
  // Impersonate USDe whale
  console.log("\n3️⃣ Impersonating USDe whale...");
  await ethers.provider.send("hardhat_impersonateAccount", [USDe_WHALE]);
  const usdeWhaleSigner = await ethers.provider.getSigner(USDe_WHALE);
  
  // Fund the whale with ETH for gas
  const fundWhale2 = await signer.sendTransaction({
    to: USDe_WHALE,
    value: ethers.parseEther("1")
  });
  await fundWhale2.wait();
  
  // Get USDe contract
  const usdeContract = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)",
     "function transfer(address to, uint256 amount) returns (bool)"],
    USDe_ADDRESS
  );
  
  // Check whale balance
  const usdeWhaleBalance = await usdeContract.balanceOf(USDe_WHALE);
  console.log("🐋 USDe Whale balance:", ethers.formatUnits(usdeWhaleBalance, 18), "USDe");
  
  // Send USDe to recipient using the impersonated account
  const usdeAmount = ethers.parseUnits("10000", 18); // 10,000 USDe
  if (usdeWhaleBalance >= usdeAmount) {
    const usdeTx = await usdeContract.connect(usdeWhaleSigner).transfer(recipient, usdeAmount);
    await usdeTx.wait();
    console.log("✅ Sent 10,000 USDe to", recipient);
  } else {
    console.log("⚠️ Whale doesn't have enough USDe, sending available amount");
    const usdeTx = await usdeContract.connect(usdeWhaleSigner).transfer(recipient, usdeWhaleBalance);
    await usdeTx.wait();
    console.log("✅ Sent", ethers.formatUnits(usdeWhaleBalance, 18), "USDe to", recipient);
  }
  
  // Stop impersonating USDe whale
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [USDe_WHALE]);
  
  // Check final balances
  console.log("\n4️⃣ Final balances for", recipient);
  const recipientUSDC = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    USDC_ADDRESS
  );
  const recipientUSDe = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    USDe_ADDRESS
  );
  
  const finalUSDC = await recipientUSDC.balanceOf(recipient);
  const finalUSDe = await recipientUSDe.balanceOf(recipient);
  const finalETH = await ethers.provider.getBalance(recipient);
  
  console.log("💰 ETH:", ethers.formatEther(finalETH));
  console.log("💵 USDC:", ethers.formatUnits(finalUSDC, 6));
  console.log("💴 USDe:", ethers.formatUnits(finalUSDe, 18));
  
  console.log("\n========================================");
  console.log("✅ Account Funded Successfully!");
  console.log("========================================");
  
  console.log("\n📱 MetaMask Configuration:");
  console.log("========================================");
  console.log("1. Open MetaMask");
  console.log("2. Click the network dropdown (usually shows 'Ethereum Mainnet')");
  console.log("3. Click 'Add Network' or 'Add network manually'");
  console.log("4. Enter these details:");
  console.log("   • Network Name: Localhost (Base Fork)");
  console.log("   • New RPC URL: http://127.0.0.1:8545");
  console.log("   • Chain ID: 31337");
  console.log("   • Currency Symbol: ETH");
  console.log("   • Block Explorer URL: (leave blank)");
  console.log("5. Click 'Save'");
  console.log("\n6. To add USDC token:");
  console.log("   • Click 'Import tokens' at bottom of MetaMask");
  console.log("   • Token Contract Address:", USDC_ADDRESS);
  console.log("   • Token Symbol: USDC");
  console.log("   • Token Decimal: 6");
  console.log("\n7. To add USDe token:");
  console.log("   • Token Contract Address:", USDe_ADDRESS);
  console.log("   • Token Symbol: USDe");
  console.log("   • Token Decimal: 18");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
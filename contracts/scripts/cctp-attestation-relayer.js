const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 CCTP V2 ATTESTATION RELAYER");
  console.log("==============================\n");
  
  // Transaction to monitor
  const txHash = process.argv[2] || "YOUR_TX_HASH";
  const sourceDomain = 6; // Base
  const destDomain = 3; // Arbitrum
  
  console.log(`📋 Monitoring TX: ${txHash}`);
  console.log(`🌐 Source: Base (domain ${sourceDomain})`);
  console.log(`🎯 Destination: Arbitrum (domain ${destDomain})\n`);
  
  // Circle API endpoints
  const apiBase = "https://iris-api.circle.com";
  
  console.log("🔍 Step 1: Fetching transfer details from Circle API...");
  
  const apiUrl = `${apiBase}/v1/messages/${sourceDomain}/${txHash}`;
  console.log(`📡 API: ${apiUrl}`);
  
  try {
    // Fetch transfer details
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log(`❌ API Error: ${response.status}`);
      console.log("Transfer may not be processed yet. Try again in a few seconds.");
      return;
    }
    
    const data = await response.json();
    console.log("✅ Transfer found!\n");
    
    // Check for attestation
    if (!data.messages || data.messages.length === 0) {
      console.log("❌ No messages found");
      return;
    }
    
    const message = data.messages[0];
    const attestation = message.attestation;
    const messageBytes = message.message;
    const eventNonce = message.eventNonce;
    
    console.log(`📊 Transfer Details:`);
    console.log(`   Event Nonce: ${eventNonce}`);
    console.log(`   Message Length: ${messageBytes.length} bytes`);
    console.log(`   Attestation: ${attestation === "PENDING" ? "⏳ PENDING" : "✅ READY"}`);
    
    if (attestation === "PENDING") {
      console.log("\n⏳ Attestation not ready yet.");
      console.log("For CCTP v2 fast transfers, this should be ready in 8-20 seconds.");
      console.log("For standard transfers, this takes 10-20 minutes.");
      console.log("\nTry again in a few seconds!");
      return;
    }
    
    console.log("\n✅ Attestation is ready!");
    console.log(`📋 Attestation: ${attestation.substring(0, 66)}...`);
    
    // Step 2: Submit to Arbitrum
    console.log("\n🔍 Step 2: Submitting attestation to Arbitrum...");
    
    // Arbitrum MessageTransmitter address
    const messageTransmitterArb = "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca";
    
    // Create interface for MessageTransmitter
    const messageTransmitterABI = [
      "function receiveMessage(bytes message, bytes attestation) external returns (bool success)"
    ];
    
    // Connect to Arbitrum
    console.log("🌐 Connecting to Arbitrum...");
    
    // You would need to configure Arbitrum provider here
    // For now, showing the implementation:
    
    console.log("\n📋 To complete the transfer on Arbitrum:");
    console.log("1. Connect to Arbitrum network");
    console.log("2. Call MessageTransmitter.receiveMessage()");
    console.log(`   Contract: ${messageTransmitterArb}`);
    console.log(`   Message: ${messageBytes.substring(0, 66)}...`);
    console.log(`   Attestation: ${attestation.substring(0, 66)}...`);
    
    console.log("\n💡 Implementation Code:");
    console.log("```javascript");
    console.log("const arbitrumProvider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');");
    console.log("const signer = new ethers.Wallet(privateKey, arbitrumProvider);");
    console.log("");
    console.log("const messageTransmitter = new ethers.Contract(");
    console.log("  messageTransmitterArb,");
    console.log("  messageTransmitterABI,");
    console.log("  signer");
    console.log(");");
    console.log("");
    console.log("const tx = await messageTransmitter.receiveMessage(");
    console.log("  messageBytes,");
    console.log("  attestation");
    console.log(");");
    console.log("");
    console.log("console.log('✅ USDC minted on Arbitrum!');");
    console.log("```");
    
    console.log("\n🎯 Result:");
    console.log("Once receiveMessage() is called:");
    console.log("1. MessageTransmitter verifies the attestation");
    console.log("2. TokenMinter mints USDC to the recipient");
    console.log("3. Transfer is complete!");
    
    console.log("\n⚡ CCTP v2 Advantages:");
    console.log("• Fast attestation: 8-20 seconds");
    console.log("• Automatic relay possible via monitoring");
    console.log("• No manual intervention needed with relayer");
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run with: npx hardhat run scripts/cctp-attestation-relayer.js --network base YOUR_TX_HASH
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
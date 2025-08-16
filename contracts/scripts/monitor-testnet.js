const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk"); // npm install chalk

// Load deployment
const network = process.env.NETWORK || "sepolia";
const deploymentPath = path.join(__dirname, `../deployments/${network}-deployment.json`);
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

// Monitoring configuration
const POLLING_INTERVAL = 5000; // 5 seconds
const BLOCK_CONFIRMATIONS = 2;

// Statistics tracking
const stats = {
  startTime: Date.now(),
  blocksProcessed: 0,
  eventsFound: 0,
  routes: {
    initiated: 0,
    completed: 0,
    failed: 0
  },
  protocols: {
    cctp: 0,
    layerzero: 0,
    stargate: 0
  },
  totalVolume: ethers.BigNumber.from(0)
};

async function main() {
  console.clear();
  console.log(chalk.cyan.bold("🔍 TESTNET MONITOR - STABLE ROUTER"));
  console.log(chalk.gray("=".repeat(50)));
  console.log(chalk.white(`Network: ${chalk.yellow(network)}`));
  console.log(chalk.white(`Started: ${new Date().toLocaleString()}`));
  console.log(chalk.gray("=".repeat(50)) + "\n");

  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  
  // Load contracts
  const stableRouter = new ethers.Contract(
    deployment.contracts.stableRouter,
    require("../artifacts/contracts/StableRouter.sol/StableRouter.json").abi,
    provider
  );
  
  const routeProcessor = new ethers.Contract(
    deployment.contracts.routeProcessor,
    require("../artifacts/contracts/RouteProcessor.sol/RouteProcessor.json").abi,
    provider
  );
  
  const feeManager = new ethers.Contract(
    deployment.contracts.feeManager,
    require("../artifacts/contracts/FeeManager.sol/FeeManager.json").abi,
    provider
  );

  // Set up event listeners
  setupEventListeners(stableRouter, routeProcessor, feeManager);
  
  // Start monitoring
  console.log(chalk.green("✓ Monitoring started\n"));
  
  // Poll for new blocks
  let lastBlock = await provider.getBlockNumber();
  
  setInterval(async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      
      if (currentBlock > lastBlock) {
        stats.blocksProcessed += currentBlock - lastBlock;
        lastBlock = currentBlock;
        updateDisplay();
      }
    } catch (error) {
      console.error(chalk.red("Error polling blocks:"), error.message);
    }
  }, POLLING_INTERVAL);
  
  // Update display every second
  setInterval(updateDisplay, 1000);
}

function setupEventListeners(stableRouter, routeProcessor, feeManager) {
  // StableRouter events
  stableRouter.on("RouteInitiated", async (user, sourceToken, destToken, amount, destChainId, recipient, event) => {
    stats.eventsFound++;
    stats.routes.initiated++;
    stats.totalVolume = stats.totalVolume.add(amount);
    
    const protocol = determineProtocol(sourceToken, destToken);
    stats.protocols[protocol]++;
    
    logEvent({
      type: "ROUTE_INITIATED",
      user: user,
      tokens: `${await getTokenSymbol(sourceToken)} → ${await getTokenSymbol(destToken)}`,
      amount: ethers.utils.formatUnits(amount, 6),
      chain: getChainName(destChainId),
      tx: event.transactionHash
    });
  });
  
  stableRouter.on("RouteCompleted", async (routeId, user, amountOut, event) => {
    stats.eventsFound++;
    stats.routes.completed++;
    
    logEvent({
      type: "ROUTE_COMPLETED",
      routeId: routeId.slice(0, 10) + "...",
      user: user.slice(0, 10) + "...",
      amountOut: ethers.utils.formatUnits(amountOut, 6),
      tx: event.transactionHash
    });
  });
  
  // RouteProcessor events
  routeProcessor.on("CCTPInitiated", async (token, amount, destDomain, recipient, nonce, event) => {
    stats.eventsFound++;
    
    logEvent({
      type: "CCTP_TRANSFER",
      amount: ethers.utils.formatUnits(amount, 6),
      domain: destDomain,
      nonce: nonce.toString(),
      tx: event.transactionHash
    });
  });
  
  routeProcessor.on("LayerZeroOFTSent", async (token, amount, lzChainId, recipient, event) => {
    stats.eventsFound++;
    
    logEvent({
      type: "LZ_TRANSFER",
      amount: ethers.utils.formatUnits(amount, 6),
      chain: getChainName(lzChainId),
      tx: event.transactionHash
    });
  });
  
  // FeeManager events
  feeManager.on("FeeCollected", async (token, amount, timestamp, event) => {
    stats.eventsFound++;
    
    logEvent({
      type: "FEE_COLLECTED",
      token: await getTokenSymbol(token),
      amount: ethers.utils.formatUnits(amount, 6),
      time: new Date(timestamp * 1000).toLocaleTimeString(),
      tx: event.transactionHash
    });
  });
}

function updateDisplay() {
  const runtime = Math.floor((Date.now() - stats.startTime) / 1000);
  const hours = Math.floor(runtime / 3600);
  const minutes = Math.floor((runtime % 3600) / 60);
  const seconds = runtime % 60;
  
  // Move cursor to position
  process.stdout.write('\x1b[8;0H'); // Row 8, Column 0
  
  console.log(chalk.cyan("📊 STATISTICS"));
  console.log(chalk.gray("-".repeat(50)));
  console.log(chalk.white(`Runtime: ${chalk.yellow(`${hours}h ${minutes}m ${seconds}s`)}`));
  console.log(chalk.white(`Blocks Processed: ${chalk.yellow(stats.blocksProcessed)}`));
  console.log(chalk.white(`Events Found: ${chalk.yellow(stats.eventsFound)}`));
  console.log();
  console.log(chalk.cyan("📈 ROUTES"));
  console.log(chalk.gray("-".repeat(50)));
  console.log(chalk.white(`Initiated: ${chalk.green(stats.routes.initiated)}`));
  console.log(chalk.white(`Completed: ${chalk.green(stats.routes.completed)}`));
  console.log(chalk.white(`Failed: ${chalk.red(stats.routes.failed)}`));
  console.log();
  console.log(chalk.cyan("🔀 PROTOCOLS"));
  console.log(chalk.gray("-".repeat(50)));
  console.log(chalk.white(`CCTP: ${chalk.blue(stats.protocols.cctp)}`));
  console.log(chalk.white(`LayerZero: ${chalk.magenta(stats.protocols.layerzero)}`));
  console.log(chalk.white(`Stargate: ${chalk.cyan(stats.protocols.stargate)}`));
  console.log();
  console.log(chalk.cyan("💰 VOLUME"));
  console.log(chalk.gray("-".repeat(50)));
  console.log(chalk.white(`Total: ${chalk.green("$" + ethers.utils.formatUnits(stats.totalVolume, 6))}`));
  console.log();
  console.log(chalk.cyan("📜 RECENT EVENTS"));
  console.log(chalk.gray("-".repeat(50)));
}

const eventLog = [];
const MAX_EVENT_LOG = 10;

function logEvent(event) {
  const timestamp = new Date().toLocaleTimeString();
  const eventStr = `[${timestamp}] ${getEventIcon(event.type)} ${event.type}`;
  
  eventLog.unshift({
    ...event,
    timestamp
  });
  
  if (eventLog.length > MAX_EVENT_LOG) {
    eventLog.pop();
  }
  
  // Display recent events
  process.stdout.write('\x1b[28;0H'); // Row 28, Column 0
  
  eventLog.forEach((evt, idx) => {
    const color = getEventColor(evt.type);
    console.log(color(`[${evt.timestamp}] ${getEventIcon(evt.type)} ${evt.type}`));
    console.log(chalk.gray(`   TX: ${evt.tx?.slice(0, 20)}...`));
    
    if (evt.amount) {
      console.log(chalk.gray(`   Amount: $${evt.amount}`));
    }
    console.log();
  });
}

function getEventIcon(type) {
  const icons = {
    "ROUTE_INITIATED": "🚀",
    "ROUTE_COMPLETED": "✅",
    "CCTP_TRANSFER": "🔵",
    "LZ_TRANSFER": "🟣",
    "FEE_COLLECTED": "💰",
    "ERROR": "❌"
  };
  return icons[type] || "📌";
}

function getEventColor(type) {
  const colors = {
    "ROUTE_INITIATED": chalk.yellow,
    "ROUTE_COMPLETED": chalk.green,
    "CCTP_TRANSFER": chalk.blue,
    "LZ_TRANSFER": chalk.magenta,
    "FEE_COLLECTED": chalk.cyan,
    "ERROR": chalk.red
  };
  return colors[type] || chalk.white;
}

function determineProtocol(sourceToken, destToken) {
  // Simplified protocol determination
  if (sourceToken === deployment.externalContracts.usdc) {
    return "cctp";
  }
  return "layerzero";
}

async function getTokenSymbol(address) {
  // Cache token symbols
  const symbols = {
    [deployment.externalContracts.usdc]: "USDC"
  };
  return symbols[address] || "UNKNOWN";
}

function getChainName(chainId) {
  const chains = {
    1: "Ethereum",
    11155111: "Sepolia",
    421614: "Arb-Sepolia",
    84532: "Base-Sepolia",
    43113: "Fuji"
  };
  return chains[chainId] || `Chain-${chainId}`;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow("\n\n👋 Shutting down monitor..."));
  
  // Save stats to file
  const statsPath = path.join(__dirname, `../monitoring/stats-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(statsPath), { recursive: true });
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  
  console.log(chalk.green(`✓ Stats saved to ${statsPath}`));
  process.exit(0);
});

// Start monitoring
main().catch(console.error);
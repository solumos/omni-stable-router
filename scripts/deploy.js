const { ethers } = require("hardhat");
const fs = require("fs");

// Chain configurations
const CHAIN_CONFIG = {
    // Ethereum Mainnet
    ethereum: {
        chainId: 1,
        lzEndpointId: 30101,
        cctpDomain: 0,
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        cctpTokenMessenger: "0xBd3fa81B58Ba92a82136038B25aDec7066af3155",
        cctpMessageTransmitter: "0x0a992d191DEeC32aFe36203Ad87D0d54704a6f5",
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    // Base
    base: {
        chainId: 8453,
        lzEndpointId: 30184,
        cctpDomain: 6,
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        cctpTokenMessenger: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
        cctpMessageTransmitter: "0xAD09780d193884d503182aD4588450C416D6F9D4",
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        uniswapV3Router: "0x2626664c2603336E57B271c5C0b26F421741e481"
    },
    // Avalanche C-Chain
    avalanche: {
        chainId: 43114,
        lzEndpointId: 30106,
        cctpDomain: 1,
        usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        pyusd: "0x825206E1D22691E8BE06a30BdD5667c3fF64D09e", // Example address
        cctpTokenMessenger: "0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982",
        cctpMessageTransmitter: "0x8186359aF5F57FbB40c6b14A588d2A59C0C29880",
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        curvePool: "0x..." // Would need actual Curve pool address
    },
    // Arbitrum One
    arbitrum: {
        chainId: 42161,
        lzEndpointId: 30110,
        cctpDomain: 3,
        usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        cctpTokenMessenger: "0x19330d10D9Cc8751218eaf51E8885D058642E08A",
        cctpMessageTransmitter: "0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca",
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    // Optimism
    optimism: {
        chainId: 10,
        lzEndpointId: 30111,
        cctpDomain: 2,
        usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        cctpTokenMessenger: "0x2B4069517957735bE00ceE0fadAE88a26365528f",
        cctpMessageTransmitter: "0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8",
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    // Polygon
    polygon: {
        chainId: 137,
        lzEndpointId: 30109,
        cctpDomain: 7,
        usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        cctpTokenMessenger: "0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE",
        cctpMessageTransmitter: "0xF3be9355363857F3e001be68856A2f96b4C39Ba9",
        lzEndpoint: "0x1a44076050125825900e736c501f859c50fE728c",
        uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    }
};

async function deployRouter(chainName) {
    const config = CHAIN_CONFIG[chainName];
    if (!config) {
        throw new Error(`Chain ${chainName} not configured`);
    }

    console.log(`\nDeploying to ${chainName}...`);
    console.log("Configuration:", config);

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Deploy HybridStablecoinRouter
    const Router = await ethers.getContractFactory("HybridStablecoinRouter");
    const router = await Router.deploy(
        config.lzEndpoint,
        config.cctpTokenMessenger,
        config.cctpMessageTransmitter,
        config.usdc,
        deployer.address
    );

    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log("HybridStablecoinRouter deployed to:", routerAddress);

    // Deploy SwapAggregator
    const SwapAggregator = await ethers.getContractFactory("StablecoinSwapAggregator");
    const aggregator = await SwapAggregator.deploy(deployer.address);
    
    await aggregator.waitForDeployment();
    const aggregatorAddress = await aggregator.getAddress();
    console.log("StablecoinSwapAggregator deployed to:", aggregatorAddress);

    // Configure CCTP domains for cross-chain transfers
    console.log("\nConfiguring CCTP domains...");
    for (const [otherChain, otherConfig] of Object.entries(CHAIN_CONFIG)) {
        if (otherChain !== chainName) {
            await router.setCCTPDomain(otherConfig.lzEndpointId, otherConfig.cctpDomain);
            console.log(`Set CCTP domain for ${otherChain}: EID ${otherConfig.lzEndpointId} -> Domain ${otherConfig.cctpDomain}`);
        }
    }

    // Configure supported tokens
    console.log("\nConfiguring supported tokens...");
    if (config.pyusd) {
        await router.addSupportedToken(config.pyusd);
        console.log("Added PYUSD support:", config.pyusd);
    }
    if (config.usdt) {
        await router.addSupportedToken(config.usdt);
        console.log("Added USDT support:", config.usdt);
    }

    // Configure swap routes on aggregator (example for USDC <-> PYUSD)
    if (config.pyusd && config.uniswapV3Router) {
        console.log("\nConfiguring swap routes...");
        
        // USDC -> PYUSD via Uniswap V3
        const uniswapFee = 500; // 0.05% fee tier
        await aggregator.configureRoute(
            config.usdc,
            config.pyusd,
            0, // UniswapV3
            config.uniswapV3Router,
            ethers.AbiCoder.defaultAbiCoder().encode(["uint24"], [uniswapFee]),
            50 // 0.5% slippage
        );
        console.log("Configured USDC -> PYUSD route via Uniswap V3");

        // PYUSD -> USDC via Uniswap V3
        await aggregator.configureRoute(
            config.pyusd,
            config.usdc,
            0, // UniswapV3
            config.uniswapV3Router,
            ethers.AbiCoder.defaultAbiCoder().encode(["uint24"], [uniswapFee]),
            50 // 0.5% slippage
        );
        console.log("Configured PYUSD -> USDC route via Uniswap V3");
    }

    // Save deployment info
    const deployment = {
        chain: chainName,
        chainId: config.chainId,
        contracts: {
            router: routerAddress,
            aggregator: aggregatorAddress
        },
        config: config,
        deployedAt: new Date().toISOString()
    };

    const deploymentPath = `./deployments/${chainName}.json`;
    fs.mkdirSync("./deployments", { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`\nDeployment info saved to ${deploymentPath}`);

    return deployment;
}

async function connectRouters(chainA, chainB) {
    console.log(`\nConnecting routers: ${chainA} <-> ${chainB}`);
    
    const deploymentA = JSON.parse(fs.readFileSync(`./deployments/${chainA}.json`));
    const deploymentB = JSON.parse(fs.readFileSync(`./deployments/${chainB}.json`));
    
    const Router = await ethers.getContractFactory("HybridStablecoinRouter");
    
    // Connect router A to router B
    const routerA = Router.attach(deploymentA.contracts.router);
    await routerA.setPeer(
        deploymentB.config.lzEndpointId,
        ethers.zeroPadValue(deploymentB.contracts.router, 32)
    );
    console.log(`${chainA} router connected to ${chainB}`);
    
    // Connect router B to router A
    const routerB = Router.attach(deploymentB.contracts.router);
    await routerB.setPeer(
        deploymentA.config.lzEndpointId,
        ethers.zeroPadValue(deploymentA.contracts.router, 32)
    );
    console.log(`${chainB} router connected to ${chainA}`);
}

async function main() {
    const chainToDeploy = process.env.DEPLOY_CHAIN || "base";
    
    try {
        // Deploy router on specified chain
        await deployRouter(chainToDeploy);
        
        // If deploying to multiple chains, connect them
        if (process.env.CONNECT_CHAINS) {
            const chains = process.env.CONNECT_CHAINS.split(",");
            for (let i = 0; i < chains.length - 1; i++) {
                for (let j = i + 1; j < chains.length; j++) {
                    await connectRouters(chains[i], chains[j]);
                }
            }
        }
        
        console.log("\n✅ Deployment completed successfully!");
        
    } catch (error) {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
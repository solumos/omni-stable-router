// Auto-generated TypeScript interfaces for deployed contracts
// Generated: 2025-08-17T02:26:45.039Z

export interface DeployedContracts {
  StableRouter: string;
  RouteProcessor: string;
  SwapExecutor: string;
  FeeManager: string;
  CCTPHookReceiver: string;
}

export interface NetworkDeployment {
  chainId: number;
  rpc: string;
  explorer: string;
  contracts: DeployedContracts;
  externalContracts: {
    USDC: string;
    CCTPTokenMessenger: string;
    CCTPMessageTransmitter: string;
    LayerZeroEndpoint: string;
    UniswapV3Router: string;
    StargateRouter?: string;
  };
}

export const DEPLOYMENTS: {
  sepolia: NetworkDeployment;
  baseSepolia: NetworkDeployment;
  arbitrumSepolia: NetworkDeployment;
} = {
  "sepolia": {
    "chainId": 11155111,
    "rpc": "https://ethereum-sepolia-rpc.publicnode.com",
    "explorer": "https://sepolia.etherscan.io",
    "contracts": {
      "StableRouter": "0x44A0DBcAe62a90De8E967c87aF1D670c8E0b42d0",
      "RouteProcessor": "0xD039Cb6B9BbAb2DE0Ae0D92F1DdCb8e6A4Dc88de",
      "SwapExecutor": "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
      "FeeManager": "0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79",
      "CCTPHookReceiver": "0xE99A9fF893B3aE1A86bCA965ddCe5e982773ff14"
    },
    "externalContracts": {
      "USDC": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      "CCTPTokenMessenger": "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      "CCTPMessageTransmitter": "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      "LayerZeroEndpoint": "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1",
      "StargateRouter": "0x1d4C2a246311bB9f827F4C768e277FF5787B7D7E",
      "UniswapV3Router": "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"
    }
  },
  "baseSepolia": {
    "chainId": 84532,
    "rpc": "https://sepolia.base.org",
    "explorer": "https://sepolia.basescan.org",
    "contracts": {
      "StableRouter": "0x238B153EEe7bc369F60C31Cb04d0a0e3466a82BD",
      "RouteProcessor": "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
      "SwapExecutor": "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8",
      "FeeManager": "0xA0FD978f89D941783A43aFBe092B614ef31571F3",
      "CCTPHookReceiver": "0xE2ea3f454e12362212b1734eD0218E7691bd985c"
    },
    "externalContracts": {
      "USDC": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "CCTPTokenMessenger": "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      "CCTPMessageTransmitter": "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      "LayerZeroEndpoint": "0x6EDCE65403992e310A62460808c4b910D972f10f",
      "UniswapV3Router": "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"
    }
  },
  "arbitrumSepolia": {
    "chainId": 421614,
    "rpc": "https://sepolia-rollup.arbitrum.io/rpc",
    "explorer": "https://sepolia.arbiscan.io",
    "contracts": {
      "RouteProcessor": "0xA450EB7baB661aC2C42F51B8f1e9A5BFc1fA6dE3",
      "SwapExecutor": "0xdcf63233493ce3A981B1155Fbe1fD6795f3A83d8",
      "CCTPHookReceiver": "0xA0FD978f89D941783A43aFBe092B614ef31571F3"
    },
    "externalContracts": {
      "USDC": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      "CCTPTokenMessenger": "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      "CCTPMessageTransmitter": "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      "LayerZeroEndpoint": "0x6EDCE65403992e310A62460808c4b910D972f10f",
      "UniswapV3Router": "0x101F443B4d1b059569D643917553c771E1b9663E"
    }
  }
};

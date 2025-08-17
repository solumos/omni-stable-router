import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'
import networksConfig from '@/config/networks.json'

// Build custom chains from config (all mainnet chains only)
const chains = Object.entries(networksConfig.networks).map(([chainId, network]: [string, any]) => {
  const chain = defineChain({
    id: Number(chainId),
    name: network.name,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: {
      default: { http: [network.rpcUrls.default] },
      public: { http: [network.rpcUrls.default] },
    },
    blockExplorers: {
      default: network.blockExplorer,
    },
    contracts: network.contracts as any,
  })
  
  // Temporarily disable multicall for Base to fix balance fetching issues
  if (Number(chainId) === 8453) {
    delete chain.contracts?.multicall3
  }
  
  return chain
})

export const config = getDefaultConfig({
  appName: 'StableRouter',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: chains as any,
  ssr: true,
})
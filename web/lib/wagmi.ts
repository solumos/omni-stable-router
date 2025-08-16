import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'
import networksConfig from '@/config/networks.json'

// Build custom chains from config
const chains = Object.entries(networksConfig.networks).map(([chainId, network]) => {
  return defineChain({
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
})

export const config = getDefaultConfig({
  appName: 'StableRouter',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: chains as any,
  ssr: true,
})
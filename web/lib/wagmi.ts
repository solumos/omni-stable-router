import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { defineChain } from 'viem'
import networksConfig from '@/config/networks.json'

// Check if we're in development/localhost mode
const isLocalhost = process.env.NODE_ENV === 'development' || 
                   process.env.NEXT_PUBLIC_ENABLE_LOCALHOST === 'true'

// Build custom chains from config, filtering based on environment
const chains = Object.entries(networksConfig.networks)
  .filter(([chainId, network]: [string, any]) => {
    // In localhost mode, only show localhost networks
    if (isLocalhost) {
      return network.localhost === true
    }
    // In production, show all non-localhost networks
    return !network.localhost
  })
  .map(([chainId, network]: [string, any]) => {
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
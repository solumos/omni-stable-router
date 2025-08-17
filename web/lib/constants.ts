import networksConfig from '@/config/networks.json'
import tokensConfig from '@/config/tokens.json'

// Chain logos mapping
const CHAIN_LOGOS: Record<string, string> = {
  '1': '/logos/ethereum-eth-logo.svg',
  '10': '/logos/ethereum-eth-logo.svg', // Optimism uses ETH logo for now
  '137': '/logos/polygon-matic-logo.svg',
  '8453': '/logos/base.svg',
  '42161': '/logos/arbitrum-arb-logo.svg',
  '43114': '/logos/avalanche-avax-logo.svg',
  '11155111': '/logos/ethereum-eth-logo.svg', // Sepolia
  '84532': '/logos/base.svg', // Base Sepolia
}

// Build CHAINS from config
export const CHAINS = Object.entries(networksConfig.networks).reduce(
  (acc, [chainId, network]) => {
    const key = network.shortName.toUpperCase().replace('-', '_')
    acc[key as keyof typeof acc] = {
      id: Number(chainId),
      name: network.name,
      short: network.shortName,
      logo: CHAIN_LOGOS[chainId] || '/logos/ethereum-eth-logo.svg',
    }
    return acc
  },
  {} as Record<string, { id: number; name: string; short: string; logo: string }>
)

// Token logos mapping
const TOKEN_LOGOS: Record<string, string> = {
  'USDC': '/logos/usd-coin-usdc-logo.svg',
  'USDT': '/logos/tether-usdt-logo.svg',
  'PYUSD': '/logos/paypal-usd-pyusd-logo.svg',
  'USDe': '/logos/ethena-usde-usde-logo.svg',
  'crvUSD': '/logos/crvusd.svg',
}

// Build TOKENS from config
export const TOKENS = Object.entries(tokensConfig.tokens).reduce(
  (acc, [symbol, token]) => {
    acc[symbol as keyof typeof acc] = {
      symbol,
      name: token.name,
      decimals: token.decimals,
      protocol: token.protocol,
      logo: TOKEN_LOGOS[symbol] || '/logos/usd-coin-usdc-logo.svg',
      addresses: Object.entries(token.addresses).reduce(
        (addrAcc, [chainId, address]) => {
          addrAcc[Number(chainId)] = address
          return addrAcc
        },
        {} as Record<number, string>
      ),
      icon: token.icon,
    }
    return acc
  },
  {} as Record<string, any>
) as const

// Protocol fees from config
export const PROTOCOL_FEES = tokensConfig.protocolFees

export type ChainId = keyof typeof CHAINS extends infer K
  ? K extends keyof typeof CHAINS
    ? typeof CHAINS[K]['id']
    : never
  : never

export type TokenSymbol = keyof typeof TOKENS

export const getTokensForChain = (chainId: number): TokenSymbol[] => {
  return Object.entries(TOKENS)
    .filter(([_, token]) => chainId in token.addresses)
    .map(([symbol]) => symbol as TokenSymbol)
}

export const isTokenAvailableOnChain = (
  token: TokenSymbol,
  chainId: number
): boolean => {
  return chainId in TOKENS[token].addresses
}
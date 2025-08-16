import networksConfig from '@/config/networks.json'
import tokensConfig from '@/config/tokens.json'

// Build CHAINS from config
export const CHAINS = Object.entries(networksConfig.networks).reduce(
  (acc, [chainId, network]) => {
    const key = network.shortName.toUpperCase().replace('-', '_')
    acc[key as keyof typeof acc] = {
      id: Number(chainId),
      name: network.name,
      short: network.shortName,
    }
    return acc
  },
  {} as Record<string, { id: number; name: string; short: string }>
)

// Build TOKENS from config
export const TOKENS = Object.entries(tokensConfig.tokens).reduce(
  (acc, [symbol, token]) => {
    acc[symbol as keyof typeof acc] = {
      symbol,
      name: token.name,
      decimals: token.decimals,
      protocol: token.protocol,
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
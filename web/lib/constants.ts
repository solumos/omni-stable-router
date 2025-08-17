import networksConfig from '@/config/networks.json'
import tokensConfig from '@/config/tokens.json'

// Chain logos mapping
const CHAIN_LOGOS: Record<string, string> = {
  '1': '/logos/ethereum-eth-logo.svg',
  '8453': '/logos/base.svg',
  '42161': '/logos/arbitrum-arb-logo.svg',
  '43114': '/logos/avalanche-avax-logo.svg',
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

// Type for Token
type Token = {
  symbol: string
  name: string
  decimals: number
  protocol: string
  logo: string
  addresses: Record<number, string>
  icon?: string
}

// Build TOKENS from config
export const TOKENS = Object.entries(tokensConfig.tokens).reduce(
  (acc, [symbol, token]) => {
    acc[symbol] = {
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
  {} as Record<string, Token>
)

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
    .filter(([_, token]) => token && token.addresses && chainId in token.addresses)
    .map(([symbol]) => symbol as TokenSymbol)
}

export const isTokenAvailableOnChain = (
  token: TokenSymbol,
  chainId: number
): boolean => {
  const tokenData = TOKENS[token]
  if (!tokenData) {
    console.warn(`Token ${token} not found in TOKENS`)
    return false
  }
  return chainId in tokenData.addresses
}
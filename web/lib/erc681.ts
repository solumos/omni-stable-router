import { type Address } from 'viem'
import { TOKENS, type TokenSymbol } from './constants'

interface ERC681Params {
  contractAddress: Address
  sourceToken: TokenSymbol
  destToken: TokenSymbol
  sourceChain: number
  destChain: number
  amount: bigint
  recipient: Address
}

/**
 * Generate an ERC-681 URL for executing cross-chain swaps
 * ERC-681 format: ethereum:<contract>@<chainId>/<function>?<params>
 */
export function generateERC681(params: ERC681Params): string {
  const {
    contractAddress,
    sourceToken,
    destToken,
    sourceChain,
    destChain,
    amount,
    recipient,
  } = params

  // Determine the function to call based on the tokens and chains
  let functionName = 'executeRoute'
  const functionParams = new URLSearchParams()

  // Add source token address
  const sourceTokenAddress = TOKENS[sourceToken].addresses[sourceChain as keyof typeof TOKENS[typeof sourceToken]['addresses']]
  functionParams.append('sourceToken', sourceTokenAddress)

  // Add destination token address
  const destTokenAddress = TOKENS[destToken].addresses[destChain as keyof typeof TOKENS[typeof destToken]['addresses']]
  functionParams.append('destToken', destTokenAddress)

  // Add other parameters
  functionParams.append('amount', amount.toString())
  functionParams.append('destChainId', destChain.toString())
  functionParams.append('recipient', recipient)

  // Determine protocol-specific parameters
  if (sourceToken === 'USDC' && destToken !== 'USDC') {
    // CCTP with hooks
    functionParams.append('protocol', '5') // CCTP_HOOKS
  } else if (sourceToken === 'USDT' || destToken === 'USDT') {
    // Stargate
    functionParams.append('protocol', '3') // STARGATE
  } else if (sourceToken === destToken) {
    // LayerZero OFT direct transfer
    functionParams.append('protocol', '2') // LAYERZERO_OFT
  } else {
    // LayerZero Composer for cross-token swaps
    functionParams.append('protocol', '4') // LZ_COMPOSER
  }

  // Build the ERC-681 URL
  const erc681Url = `ethereum:${contractAddress}@${sourceChain}/${functionName}?${functionParams.toString()}`

  return erc681Url
}

/**
 * Parse an ERC-681 URL into its components
 */
export function parseERC681(url: string) {
  const match = url.match(/^ethereum:([^@]+)@(\d+)\/([^?]+)\?(.+)$/)
  
  if (!match) {
    throw new Error('Invalid ERC-681 URL format')
  }

  const [, contractAddress, chainId, functionName, paramsString] = match
  const params = new URLSearchParams(paramsString)

  return {
    contractAddress,
    chainId: parseInt(chainId),
    functionName,
    params: Object.fromEntries(params.entries()),
  }
}

/**
 * Generate a deep link for mobile wallets
 */
export function generateWalletDeepLink(erc681Url: string, walletType: 'metamask' | 'rainbow' | 'coinbase' = 'metamask'): string {
  const encodedUrl = encodeURIComponent(erc681Url)

  switch (walletType) {
    case 'metamask':
      return `metamask://send/${encodedUrl}`
    case 'rainbow':
      return `rainbow://send?${encodedUrl}`
    case 'coinbase':
      return `cbwallet://send?${encodedUrl}`
    default:
      return erc681Url
  }
}
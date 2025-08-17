import { useEffect, useState } from 'react'
import { TOKENS, PROTOCOL_FEES, type TokenSymbol } from '@/lib/constants'

interface SwapQuoteParams {
  sourceToken: TokenSymbol
  destToken: TokenSymbol
  sourceChain: number
  destChain: number
  amount: bigint
}

interface SwapQuote {
  estimatedOutput: bigint
  protocol: string
  networkFee: number
  estimatedTime: string
  route: string
}

export function useSwapQuote(params: SwapQuoteParams) {
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (params.amount === BigInt(0)) {
      setQuote(null)
      return
    }

    const fetchQuote = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Determine protocol based on tokens and chains
        let protocolKey = 'LAYERZERO_OFT' // Default for same token transfers
        let estimatedTime = '1-2 minutes'
        
        const isCrossChain = params.sourceChain !== params.destChain
        const isSameToken = params.sourceToken === params.destToken

        if (isSameToken && isCrossChain) {
          // Cross-chain same token transfers
          if (params.sourceToken === 'USDC') {
            // USDC always uses CCTP V2 for cross-chain
            protocolKey = 'CCTP'
            estimatedTime = '8-20 seconds'
          } else {
            // All other tokens use LayerZero OFT
            protocolKey = 'LAYERZERO_OFT'
            estimatedTime = '1-2 minutes'
          }
        } else if (!isSameToken && isCrossChain) {
          // Cross-chain with token swap
          if (params.sourceToken === 'USDC' && params.destToken !== 'USDC') {
            // USDC to non-USDC uses CCTP V2 Hooks
            protocolKey = 'CCTP_HOOKS'
            estimatedTime = '30 seconds'
          } else if (params.destToken === 'USDC' && params.sourceToken !== 'USDC') {
            // Non-USDC to USDC also uses CCTP V2 Hooks
            protocolKey = 'CCTP_HOOKS'
            estimatedTime = '30 seconds'
          } else if (params.sourceToken === 'USDT' || params.destToken === 'USDT') {
            protocolKey = 'STARGATE_SWAP'
            estimatedTime = '2-3 minutes'
          } else {
            // Non-USDC different tokens use Composed OFT
            protocolKey = 'COMPOSED_OFT'
            estimatedTime = '2-3 minutes'
          }
        } else if (!isSameToken && !isCrossChain) {
          // Same-chain swap
          protocolKey = 'DEX_AGGREGATOR'
          estimatedTime = '15 seconds'
        }

        const protocolFee = PROTOCOL_FEES[protocolKey as keyof typeof PROTOCOL_FEES]
        const networkFee = protocolFee?.baseFee || 0.6

        // Simple slippage calculation (0.1% for demo)
        const slippage = params.amount / BigInt(1000)
        let estimatedOutput = params.amount - slippage

        // Handle decimal conversions
        const sourceDecimals = TOKENS[params.sourceToken].decimals
        const destDecimals = TOKENS[params.destToken].decimals

        if (sourceDecimals !== destDecimals) {
          if (sourceDecimals > destDecimals) {
            estimatedOutput = estimatedOutput / BigInt(10 ** (sourceDecimals - destDecimals))
          } else {
            estimatedOutput = estimatedOutput * BigInt(10 ** (destDecimals - sourceDecimals))
          }
        }

        // Format protocol name for display
        let protocolDisplay = protocolKey
        switch (protocolKey) {
          case 'CCTP':
            protocolDisplay = 'CCTP V2'
            break
          case 'CCTP_HOOKS':
            protocolDisplay = 'CCTP V2 Hooks'
            break
          case 'LAYERZERO_OFT':
            protocolDisplay = 'LayerZero OFT'
            break
          case 'COMPOSED_OFT':
            protocolDisplay = 'Composed OFT'
            break
          case 'STARGATE_SWAP':
            protocolDisplay = 'Stargate'
            break
          case 'DEX_AGGREGATOR':
            protocolDisplay = 'DEX Aggregator'
            break
          default:
            protocolDisplay = protocolKey.replace('_', ' ')
        }

        setQuote({
          estimatedOutput,
          protocol: protocolDisplay,
          networkFee,
          estimatedTime,
          route: `${params.sourceToken} → ${params.destToken}`,
        })
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuote()
  }, [params.sourceToken, params.destToken, params.sourceChain, params.destChain, params.amount])

  return { quote, isLoading, error }
}
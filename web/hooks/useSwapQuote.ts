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
          if (params.sourceToken === 'USDC' || params.destToken === 'USDC') {
            protocolKey = 'CCTP_HOOKS'
            estimatedTime = '30 seconds'
          } else if (params.sourceToken === 'USDT' || params.destToken === 'USDT') {
            protocolKey = 'STARGATE_SWAP'
            estimatedTime = '2-3 minutes'
          } else {
            protocolKey = 'LZ_COMPOSER'
            estimatedTime = '2-3 minutes'
          }
        } else if (!isSameToken && !isCrossChain) {
          // Same-chain swap
          protocolKey = 'CCTP_HOOKS' // Using router for same-chain swaps
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
        let protocolDisplay = protocolKey.replace('_', ' ')
        if (protocolKey === 'CCTP') {
          protocolDisplay = 'CCTP V2'
        } else if (protocolKey === 'CCTP_HOOKS') {
          protocolDisplay = 'CCTP V2 Hooks'
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
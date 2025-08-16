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
        // Determine protocol based on tokens
        let protocolKey = 'CCTP'
        let estimatedTime = '15 seconds'

        if (params.sourceToken === 'USDC' && params.destToken !== 'USDC') {
          protocolKey = 'CCTP_HOOKS'
          estimatedTime = '30 seconds'
        } else if (params.sourceToken === 'USDT' || params.destToken === 'USDT') {
          protocolKey = params.sourceToken !== params.destToken ? 'STARGATE_SWAP' : 'STARGATE'
          estimatedTime = '2-3 minutes'
        } else if (params.sourceToken === params.destToken) {
          protocolKey = 'LAYERZERO_OFT'
          estimatedTime = '1-2 minutes'
        } else {
          protocolKey = 'LZ_COMPOSER'
          estimatedTime = '2-3 minutes'
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

        setQuote({
          estimatedOutput,
          protocol: protocolKey.replace('_', ' '),
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
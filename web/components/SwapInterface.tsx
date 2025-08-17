'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { ArrowDown, Loader2, Zap } from 'lucide-react'
import { TokenSelector } from './TokenSelector'
import { ChainSelector } from './ChainSelector'
import { CHAINS, TOKENS, getTokensForChain, isTokenAvailableOnChain, type TokenSymbol } from '@/lib/constants'
import { useSwapQuote } from '@/hooks/useSwapQuote'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { executeSwap } from '@/lib/swap'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function SwapInterface() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [sourceToken, setSourceToken] = useState<TokenSymbol>('USDC')
  const [destToken, setDestToken] = useState<TokenSymbol>('USDC')
  const [sourceChain, setSourceChain] = useState(11155111) // Default to Sepolia
  const [destChain, setDestChain] = useState(84532) // Default to Base Sepolia
  const [amount, setAmount] = useState('')
  const [isSwapping, setIsSwapping] = useState(false)

  const balance = useTokenBalance(sourceToken, sourceChain)
  const { quote, isLoading: quoteLoading, error: quoteError } = useSwapQuote({
    sourceToken,
    destToken,
    sourceChain,
    destChain,
    amount: amount ? parseUnits(amount, TOKENS[sourceToken].decimals) : BigInt(0),
  })

  const availableSourceTokens = useMemo(() => getTokensForChain(sourceChain), [sourceChain])
  const availableDestTokens = useMemo(() => getTokensForChain(destChain), [destChain])

  useEffect(() => {
    if (!isTokenAvailableOnChain(sourceToken, sourceChain)) {
      setSourceToken(availableSourceTokens[0])
    }
  }, [sourceChain, sourceToken, availableSourceTokens])

  useEffect(() => {
    if (!isTokenAvailableOnChain(destToken, destChain)) {
      setDestToken(availableDestTokens[0])
    }
  }, [destChain, destToken, availableDestTokens])

  const handleSwap = async () => {
    if (!isConnected || !address || !amount || !quote) return

    if (chainId !== sourceChain) {
      await switchChain({ chainId: sourceChain })
      return
    }

    setIsSwapping(true)
    try {
      await executeSwap({
        sourceToken,
        destToken,
        sourceChain,
        destChain,
        amount: parseUnits(amount, TOKENS[sourceToken].decimals),
        recipient: address,
        quote,
      })
      setAmount('')
    } catch (error) {
      console.error('Swap failed:', error)
    } finally {
      setIsSwapping(false)
    }
  }

  const insufficientBalance = balance && amount
    ? parseUnits(amount, TOKENS[sourceToken].decimals) > balance
    : false

  const switchTokens = () => {
    setSourceToken(destToken)
    setDestToken(sourceToken)
    setSourceChain(destChain)
    setDestChain(sourceChain)
  }

  return (
    <Card className="bg-white shadow-xl border-0">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
            <Zap className="w-5 h-5 text-white" />
          </div>
          Swap
        </CardTitle>
        <CardDescription>
          Exchange stablecoins across different blockchain networks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Token */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">You pay</Label>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-2xl font-semibold border-0 bg-transparent h-auto p-0 focus-visible:ring-0"
                />
                {balance && (
                  <button
                    onClick={() => setAmount(formatUnits(balance, TOKENS[sourceToken].decimals))}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Max: {formatUnits(balance, TOKENS[sourceToken].decimals)}
                  </button>
                )}
              </div>
              <TokenSelector
                value={sourceToken}
                onChange={setSourceToken}
                tokens={availableSourceTokens}
              />
            </div>
            <ChainSelector
              value={sourceChain}
              onChange={setSourceChain}
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-2">
          <Button
            onClick={switchTokens}
            variant="outline"
            size="icon"
            className="rounded-full bg-white hover:rotate-180 transition-all duration-300 border-4 border-gray-100"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Destination Token */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">You receive</Label>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  value={quote ? formatUnits(quote.estimatedOutput, TOKENS[destToken].decimals) : ''}
                  readOnly
                  placeholder="0.00"
                  className="text-2xl font-semibold border-0 bg-transparent h-auto p-0 focus-visible:ring-0"
                />
              </div>
              <TokenSelector
                value={destToken}
                onChange={setDestToken}
                tokens={availableDestTokens}
              />
            </div>
            <ChainSelector
              value={destChain}
              onChange={setDestChain}
            />
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <div className="bg-blue-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Protocol</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {quote.protocol}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Network Fee</span>
              <span className="font-semibold text-gray-900">${quote.networkFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated Time</span>
              <span className="font-semibold text-gray-900">{quote.estimatedTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Route</span>
              <span className="font-medium text-gray-700 text-xs">{quote.route}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-6">
        {!isConnected ? (
          <Button className="w-full h-12 text-base" size="lg" disabled>
            Connect Wallet
          </Button>
        ) : chainId !== sourceChain ? (
          <Button 
            onClick={() => switchChain({ chainId: sourceChain })}
            className="w-full h-12 text-base bg-orange-500 hover:bg-orange-600"
            size="lg"
          >
            Switch to {Object.values(CHAINS).find(c => c.id === sourceChain)?.name}
          </Button>
        ) : insufficientBalance ? (
          <Button className="w-full h-12 text-base" size="lg" variant="destructive" disabled>
            Insufficient Balance
          </Button>
        ) : (
          <Button
            onClick={handleSwap}
            disabled={!amount || quoteLoading || isSwapping}
            className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            size="lg"
          >
            {isSwapping ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </>
            ) : (
              'Swap'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
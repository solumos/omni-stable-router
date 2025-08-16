'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { ArrowDown, Loader2 } from 'lucide-react'
import { TokenSelector } from './TokenSelector'
import { ChainSelector } from './ChainSelector'
import { CHAINS, TOKENS, getTokensForChain, isTokenAvailableOnChain, type TokenSymbol } from '@/lib/constants'
import { useSwapQuote } from '@/hooks/useSwapQuote'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { executeSwap } from '@/lib/swap'

export function SwapInterface() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [sourceToken, setSourceToken] = useState<TokenSymbol>('USDC')
  const [destToken, setDestToken] = useState<TokenSymbol>('USDT')
  const [sourceChain, setSourceChain] = useState(1)
  const [destChain, setDestChain] = useState(42161)
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              From
            </label>
            {balance && (
              <button
                onClick={() => setAmount(formatUnits(balance, TOKENS[sourceToken].decimals))}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Balance: {formatUnits(balance, TOKENS[sourceToken].decimals)}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-2xl font-semibold outline-none"
            />
            <TokenSelector
              value={sourceToken}
              onChange={setSourceToken}
              tokens={availableSourceTokens}
            />
          </div>
          <div className="mt-2">
            <ChainSelector
              value={sourceChain}
              onChange={setSourceChain}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              setSourceToken(destToken)
              setDestToken(sourceToken)
              setSourceChain(destChain)
              setDestChain(sourceChain)
            }}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              To
            </label>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={quote ? formatUnits(quote.estimatedOutput, TOKENS[destToken].decimals) : ''}
              readOnly
              placeholder="0.00"
              className="flex-1 bg-transparent text-2xl font-semibold outline-none"
            />
            <TokenSelector
              value={destToken}
              onChange={setDestToken}
              tokens={availableDestTokens}
            />
          </div>
          <div className="mt-2">
            <ChainSelector
              value={destChain}
              onChange={setDestChain}
            />
          </div>
        </div>

        {quote && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Protocol</span>
              <span className="font-medium">{quote.protocol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
              <span className="font-medium">${quote.networkFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Est. Time</span>
              <span className="font-medium">{quote.estimatedTime}</span>
            </div>
          </div>
        )}

        {!isConnected ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-gray-300 text-gray-500 font-semibold cursor-not-allowed"
          >
            Connect Wallet
          </button>
        ) : chainId !== sourceChain ? (
          <button
            onClick={() => switchChain({ chainId: sourceChain })}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            Switch to {Object.values(CHAINS).find(c => c.id === sourceChain)?.name}
          </button>
        ) : insufficientBalance ? (
          <button
            disabled
            className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold cursor-not-allowed"
          >
            Insufficient Balance
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={!amount || quoteLoading || isSwapping}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isSwapping ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Swapping...
              </>
            ) : (
              'Swap'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
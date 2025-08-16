'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { ArrowRight, Loader2 } from 'lucide-react'
import { TokenSelector } from './TokenSelector'
import { ChainSelector } from './ChainSelector'
import { CHAINS, TOKENS, getTokensForChain, type TokenSymbol } from '@/lib/constants'
import { useSwapQuote } from '@/hooks/useSwapQuote'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { generateERC681 } from '@/lib/erc681'

interface PaymentDetails {
  receiveToken: TokenSymbol
  receiveChain: number
  amount: string
  description?: string
}

interface PaymentInterfaceProps {
  paymentId: string
}

export function PaymentInterface({ paymentId }: PaymentInterfaceProps) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [sourceToken, setSourceToken] = useState<TokenSymbol>('USDC')
  const [sourceChain, setSourceChain] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Load payment details
    const stored = localStorage.getItem(`payment_${paymentId}`)
    if (stored) {
      const details = JSON.parse(stored)
      setPaymentDetails({
        receiveToken: details.receiveToken,
        receiveChain: details.receiveChain,
        amount: details.amount,
        description: details.description,
      })
    }
  }, [paymentId])

  const availableSourceTokens = useMemo(() => getTokensForChain(sourceChain), [sourceChain])

  const balance = useTokenBalance(sourceToken, sourceChain)
  
  const { quote, isLoading: quoteLoading } = useSwapQuote({
    sourceToken,
    destToken: paymentDetails?.receiveToken || 'USDC',
    sourceChain,
    destChain: paymentDetails?.receiveChain || 1,
    amount: paymentDetails?.amount ? BigInt(paymentDetails.amount) : BigInt(0),
  })

  const handlePayment = async () => {
    if (!isConnected || !address || !paymentDetails || !quote) return

    if (chainId !== sourceChain) {
      await switchChain({ chainId: sourceChain })
      return
    }

    setIsProcessing(true)
    try {
      // Generate ERC-681 transaction
      const erc681 = generateERC681({
        contractAddress: '0x...', // StableRouter contract address
        sourceToken,
        destToken: paymentDetails.receiveToken,
        sourceChain,
        destChain: paymentDetails.receiveChain,
        amount: BigInt(paymentDetails.amount),
        recipient: address, // In production, this would be the payment requester's address
      })

      console.log('ERC-681 URL:', erc681)
      
      // Execute the payment
      // In production, this would use the ERC-681 to execute the transaction
      
      alert('Payment sent successfully!')
      router.push('/')
    } catch (error) {
      console.error('Payment failed:', error)
      alert('Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!paymentDetails) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  const requiredAmount = BigInt(paymentDetails.amount)
  const insufficientBalance = balance && balance < requiredAmount

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Payment Request
        </h1>
        {paymentDetails.description && (
          <p className="text-center text-gray-600 dark:text-gray-400">
            {paymentDetails.description}
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Requested Amount
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {formatUnits(requiredAmount, TOKENS[paymentDetails.receiveToken].decimals)}
              </span>
              <span className="text-xl font-semibold">{paymentDetails.receiveToken}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              on {Object.values(CHAINS).find(c => c.id === paymentDetails.receiveChain)?.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pay With
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-semibold">
                  {quote ? formatUnits(quote.estimatedOutput, TOKENS[sourceToken].decimals) : '...'}
                </span>
                <TokenSelector
                  value={sourceToken}
                  onChange={setSourceToken}
                  tokens={availableSourceTokens}
                />
              </div>
              <div className="flex items-center justify-between">
                <ChainSelector
                  value={sourceChain}
                  onChange={setSourceChain}
                />
                {balance && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Balance: {formatUnits(balance, TOKENS[sourceToken].decimals)}
                  </span>
                )}
              </div>
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
            </div>
          )}

          {!isConnected ? (
            <button
              disabled
              className="w-full py-3 rounded-xl bg-gray-300 text-gray-500 font-semibold cursor-not-allowed"
            >
              Connect Wallet to Pay
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
              onClick={handlePayment}
              disabled={quoteLoading || isProcessing}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                'Send Payment'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
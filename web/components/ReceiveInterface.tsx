'use client'

import { useState, useMemo } from 'react'
import { Copy, Share2, CheckCircle } from 'lucide-react'
import { TokenSelector } from './TokenSelector'
import { ChainSelector } from './ChainSelector'
import { CHAINS, TOKENS, getTokensForChain, type TokenSymbol } from '@/lib/constants'
import { formatUnits, parseUnits } from 'viem'

export function ReceiveInterface() {
  const [receiveToken, setReceiveToken] = useState<TokenSymbol>('USDC')
  const [receiveChain, setReceiveChain] = useState(1)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [copied, setCopied] = useState(false)

  const availableTokens = useMemo(() => getTokensForChain(receiveChain), [receiveChain])

  const generatePaymentLink = () => {
    if (!amount) return

    // Generate a unique payment ID
    const paymentId = Math.random().toString(36).substring(2, 15)
    
    // Encode payment details
    const params = new URLSearchParams({
      id: paymentId,
      token: receiveToken,
      chain: receiveChain.toString(),
      amount: parseUnits(amount, TOKENS[receiveToken].decimals).toString(),
      desc: description,
    })

    const link = `${window.location.origin}/receive?${params.toString()}`
    setPaymentLink(link)

    // Store payment details (in production, this would be stored in a database)
    localStorage.setItem(`payment_${paymentId}`, JSON.stringify({
      receiveToken,
      receiveChain,
      amount: parseUnits(amount, TOKENS[receiveToken].decimals).toString(),
      description,
      createdAt: Date.now(),
    }))
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(paymentLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Payment Request',
        text: description || 'Please send payment via StableRouter',
        url: paymentLink,
      })
    } else {
      copyToClipboard()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Request Payment
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Create a payment link for receiving stablecoins
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount to Receive
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-2xl font-semibold outline-none"
                />
                <TokenSelector
                  value={receiveToken}
                  onChange={setReceiveToken}
                  tokens={availableTokens}
                />
              </div>
              <div className="mt-2">
                <ChainSelector
                  value={receiveChain}
                  onChange={setReceiveChain}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this payment for?"
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <button
            onClick={generatePaymentLink}
            disabled={!amount}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            Generate Payment Link
          </button>

          {paymentLink && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your payment link is ready!
              </p>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 break-all text-sm font-mono">
                {paymentLink}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
                <button
                  onClick={shareLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
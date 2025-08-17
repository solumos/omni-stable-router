'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { formatUnits, parseUnits, isAddress } from 'viem'
import { ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { TokenSelector } from './TokenSelector'
import { ChainSelector } from './ChainSelector'
import { TransferStatus } from './TransferStatus'
import { CHAINS, TOKENS, getTokensForChain, isTokenAvailableOnChain, type TokenSymbol } from '@/lib/constants'
import { useSwapQuote } from '@/hooks/useSwapQuote'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { executeSwap } from '@/lib/swap'
import { isCCTPTransfer } from '@/lib/relayer-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function SendInterface() {
  const searchParams = useSearchParams()
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  // Extract params from URL
  const recipientAddress = searchParams.get('to') || ''
  const requestedToken = (searchParams.get('token') || 'USDC') as TokenSymbol
  const requestedChain = parseInt(searchParams.get('chain') || '1')
  const requestedAmount = searchParams.get('amount') || ''

  // Source selection (what user will send)
  const [sourceToken, setSourceToken] = useState<TokenSymbol>('USDC')
  const [sourceChain, setSourceChain] = useState(1) // Default to Ethereum
  const [isSending, setIsSending] = useState(false)
  const [completedTxHash, setCompletedTxHash] = useState<string | null>(null)

  // Get available tokens for source chain
  const availableSourceTokens = useMemo(() => getTokensForChain(sourceChain), [sourceChain])
  
  // Get valid source combinations that can route to the destination
  const validSourceCombinations = useMemo(() => {
    const combinations: Array<{ token: TokenSymbol; chain: number }> = []
    
    // For each chain, check which tokens can route to the destination
    Object.values(CHAINS).forEach(chain => {
      getTokensForChain(chain.id).forEach(token => {
        // Add routing logic here - for now, allow all combinations
        // In real implementation, check if there's a valid route
        combinations.push({ token, chain: chain.id })
      })
    })
    
    return combinations
  }, [requestedToken, requestedChain])

  const balance = useTokenBalance(sourceToken, sourceChain)
  const { quote, isLoading: quoteLoading, error: quoteError } = useSwapQuote({
    sourceToken,
    destToken: requestedToken,
    sourceChain,
    destChain: requestedChain,
    amount: requestedAmount ? parseUnits(requestedAmount, TOKENS[requestedToken].decimals) : BigInt(0),
  })

  // Update source token when chain changes
  useEffect(() => {
    if (!isTokenAvailableOnChain(sourceToken, sourceChain)) {
      setSourceToken(availableSourceTokens[0])
    }
  }, [sourceChain, sourceToken, availableSourceTokens])

  // Validation
  const isValidRequest = useMemo(() => {
    return (
      isAddress(recipientAddress) &&
      requestedAmount &&
      parseFloat(requestedAmount) > 0 &&
      TOKENS[requestedToken] &&
      CHAINS[Object.keys(CHAINS).find(key => CHAINS[key].id === requestedChain) || '']
    )
  }, [recipientAddress, requestedAmount, requestedToken, requestedChain])

  const canExecute = useMemo(() => {
    if (!isValidRequest || !quote || !balance || !requestedAmount) return false
    
    const requiredAmount = parseUnits(requestedAmount, TOKENS[requestedToken].decimals)
    return balance >= requiredAmount
  }, [isValidRequest, quote, balance, requestedAmount, requestedToken])

  const handleSend = async () => {
    if (!isConnected || !address || !quote || !requestedAmount) return

    if (chainId !== sourceChain) {
      await switchChain({ chainId: sourceChain })
      return
    }

    setIsSending(true)
    try {
      const receipt = await executeSwap({
        sourceToken,
        destToken: requestedToken,
        sourceChain,
        destChain: requestedChain,
        amount: parseUnits(requestedAmount, TOKENS[requestedToken].decimals),
        recipient: recipientAddress as `0x${string}`,
        quote,
      })
      
      // If successful, show the transfer status
      setCompletedTxHash(receipt.transactionHash)
      
      // Log whether this will use the relayer
      if (isCCTPTransfer(sourceToken, requestedToken, sourceChain, requestedChain)) {
        console.log('✅ CCTP transfer initiated with automated attestation')
      }
    } catch (error) {
      console.error('Send failed:', error)
    } finally {
      setIsSending(false)
    }
  }

  if (!isValidRequest) {
    return (
      <Card className="bg-white shadow-2xl border-0">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid payment request. Please check the payment link and try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show transfer status if we have a completed transaction
  if (completedTxHash) {
    return (
      <div className="space-y-4">
        <TransferStatus
          txHash={completedTxHash}
          sourceChain={sourceChain}
          destChain={requestedChain}
          amount={requestedAmount}
          token={requestedToken}
          onClose={() => setCompletedTxHash(null)}
        />
        
        {/* Option to make another payment */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setCompletedTxHash(null)
            // Reset form if needed
          }}
        >
          Make Another Payment
        </Button>
      </div>
    )
  }

  return (
    <Card className="bg-white shadow-2xl border-0 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          Send Payment
        </CardTitle>
        <CardDescription>
          Complete this payment using your preferred token and chain
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Payment Request Details */}
        <div className="bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Payment Request</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Amount:</span>
              <div className="font-semibold">{requestedAmount} {requestedToken}</div>
            </div>
            <div>
              <span className="text-gray-600">Network:</span>
              <div className="font-semibold">{CHAINS[Object.keys(CHAINS).find(key => CHAINS[key].id === requestedChain) || '']?.name}</div>
            </div>
          </div>
          <div>
            <span className="text-gray-600 text-sm">To:</span>
            <div className="font-mono text-sm break-all">{recipientAddress}</div>
          </div>
        </div>

        {/* Source Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Pay with</Label>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex gap-3 items-center">
              <div className="flex-1 bg-white rounded-lg px-3 py-2 min-h-[48px] flex items-center">
                <Input
                  type="number"
                  value={requestedAmount}
                  readOnly
                  className="text-xl font-semibold border-0 bg-transparent h-auto p-0 focus-visible:ring-0 w-full text-gray-600"
                />
              </div>
              <div className="flex gap-2">
                <TokenSelector
                  value={sourceToken}
                  onChange={setSourceToken}
                  tokens={availableSourceTokens}
                />
                <ChainSelector
                  value={sourceChain}
                  onChange={setSourceChain}
                />
              </div>
            </div>
            {balance && (
              <div className="mt-2 text-xs text-gray-600">
                Balance: {formatUnits(balance, TOKENS[sourceToken].decimals)} {sourceToken}
              </div>
            )}
          </div>
        </div>

        {/* Route Display */}
        {quote && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{sourceToken}</Badge>
                  <span className="text-xs text-gray-500">on {CHAINS[Object.keys(CHAINS).find(key => CHAINS[key].id === sourceChain) || '']?.short}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{requestedToken}</Badge>
                  <span className="text-xs text-gray-500">on {CHAINS[Object.keys(CHAINS).find(key => CHAINS[key].id === requestedChain) || '']?.short}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-gray-600">Protocol:</span>
              <Badge variant="secondary">{quote.protocol}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Network Fee:</span>
              <span className="font-semibold">${quote.networkFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Est. Time:</span>
              <span className="font-semibold">{quote.estimatedTime}</span>
            </div>
          </div>
        )}
      </CardContent>

      <div className="p-6 pt-0">
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
            Switch to {CHAINS[Object.keys(CHAINS).find(key => CHAINS[key].id === sourceChain) || '']?.name}
          </Button>
        ) : !canExecute ? (
          <Button className="w-full h-12 text-base" size="lg" variant="destructive" disabled>
            {!balance || balance < parseUnits(requestedAmount, TOKENS[requestedToken].decimals) 
              ? 'Insufficient Balance' 
              : 'Loading...'}
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!canExecute || quoteLoading || isSending}
            className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send ${requestedAmount} ${requestedToken}`
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, ExternalLink, Share } from 'lucide-react'
import { TokenSelector } from './TokenSelector'
import { ChainSelector } from './ChainSelector'
import { TOKENS, CHAINS, getTokensForChain, type TokenSymbol } from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export function RequestInterface() {
  const { address } = useAccount()
  const { toast } = useToast()
  
  const [recipientAddress, setRecipientAddress] = useState(address || '')
  const [requestedToken, setRequestedToken] = useState<TokenSymbol>('USDC')
  const [requestedChain, setRequestedChain] = useState(1) // Default to Ethereum
  const [amount, setAmount] = useState('')
  
  const availableTokens = getTokensForChain(requestedChain)
  
  // Generate payment URL
  const generatePaymentUrl = () => {
    if (!recipientAddress || !amount) return ''
    
    const params = new URLSearchParams({
      to: recipientAddress,
      token: requestedToken,
      chain: requestedChain.toString(),
      amount: amount,
    })
    
    return `${window.location.origin}/send?${params.toString()}`
  }
  
  const paymentUrl = generatePaymentUrl()
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl)
      toast({
        title: "Copied!",
        description: "Payment link copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }
  
  const sharePayment = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: `Send me ${amount} ${requestedToken} on ${CHAINS[Object.keys(CHAINS).find(key => CHAINS[key].id === requestedChain) || '']?.name}`,
          url: paymentUrl,
        })
      } catch (err) {
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  return (
    <Card className="bg-white shadow-2xl border-0 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          Payment Request
        </CardTitle>
        <CardDescription>
          Configure your payment details and generate a shareable link
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Recipient Address */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Recipient Address</Label>
          <div className="bg-gray-50 rounded-xl p-4">
            <Input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="bg-white rounded-lg px-3 py-2 min-h-[48px] text-sm font-mono"
            />
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Amount</Label>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex gap-3 items-center">
              <div className="flex-1 bg-white rounded-lg px-3 py-2 min-h-[48px] flex items-center">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-xl font-semibold border-0 bg-transparent h-auto p-0 focus-visible:ring-0 w-full"
                />
              </div>
              <div className="flex gap-2">
                <TokenSelector
                  value={requestedToken}
                  onChange={setRequestedToken}
                  tokens={availableTokens}
                />
                <ChainSelector
                  value={requestedChain}
                  onChange={setRequestedChain}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Generated Link */}
        {paymentUrl && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Payment Link</h3>
              
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-white rounded-xl shadow-inner">
                  <QRCodeSVG 
                    value={paymentUrl} 
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>
              
              {/* URL Display */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 font-mono break-all">
                  {paymentUrl}
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={copyToClipboard}
                  variant="outline" 
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button 
                  onClick={sharePayment}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
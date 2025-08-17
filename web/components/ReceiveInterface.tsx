'use client'

import { useState, useMemo } from 'react'
import { Copy, Share2, CheckCircle, QrCode, Link2 } from 'lucide-react'
import { TokenSelector } from './TokenSelector'
import { ChainSelector } from './ChainSelector'
import { CHAINS, TOKENS, getTokensForChain, type TokenSymbol } from '@/lib/constants'
import { formatUnits, parseUnits } from 'viem'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export function ReceiveInterface() {
  const { toast } = useToast()
  const [receiveToken, setReceiveToken] = useState<TokenSymbol>('USDC')
  const [receiveChain, setReceiveChain] = useState(11155111)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [paymentLink, setPaymentLink] = useState('')

  const availableTokens = useMemo(() => getTokensForChain(receiveChain), [receiveChain])

  const generatePaymentLink = () => {
    if (!amount) return

    const paymentId = Math.random().toString(36).substring(2, 15)
    
    const params = new URLSearchParams({
      id: paymentId,
      token: receiveToken,
      chain: receiveChain.toString(),
      amount: parseUnits(amount, TOKENS[receiveToken].decimals).toString(),
      desc: description,
    })

    const link = `${window.location.origin}/receive?${params.toString()}`
    setPaymentLink(link)

    localStorage.setItem(`payment_${paymentId}`, JSON.stringify({
      receiveToken,
      receiveChain,
      amount: parseUnits(amount, TOKENS[receiveToken].decimals).toString(),
      description,
      createdAt: Date.now(),
    }))

    toast({
      title: "Payment link created!",
      description: "Your payment link has been generated successfully.",
    })
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(paymentLink)
    toast({
      title: "Copied!",
      description: "Payment link has been copied to clipboard.",
    })
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
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Request Payment
        </h1>
        <p className="text-muted-foreground">
          Create a payment link to receive stablecoins from anyone
        </p>
      </div>

      <Card className="border-0 shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-green-600" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Set the amount and token you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Amount to Receive</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-xl font-semibold"
              />
              <TokenSelector
                value={receiveToken}
                onChange={setReceiveToken}
                tokens={availableTokens}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Receiving Chain</Label>
            <ChainSelector
              value={receiveChain}
              onChange={setReceiveChain}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this payment for?"
              className="resize-none"
              rows={3}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={generatePaymentLink}
            disabled={!amount}
            className="w-full"
            size="lg"
          >
            Generate Payment Link
          </Button>
        </CardFooter>
      </Card>

      {paymentLink && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">
              Payment Link Ready!
            </CardTitle>
            <CardDescription>
              Share this link with anyone to receive payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-background rounded-lg border">
              <p className="text-sm font-mono break-all text-muted-foreground">
                {paymentLink}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="w-full"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button
                onClick={shareLink}
                variant="outline"
                className="w-full"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
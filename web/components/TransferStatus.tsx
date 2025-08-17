'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Clock, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTransferStatus, getStatusDisplay } from '@/hooks/useTransferStatus'
import { formatUnits } from 'viem'

interface TransferStatusProps {
  txHash: string
  sourceChain: number
  destChain: number
  amount?: string
  token?: string
  onClose?: () => void
}

const CHAIN_EXPLORERS: Record<number, { name: string; url: string }> = {
  1: { name: 'Etherscan', url: 'https://etherscan.io/tx/' },
  10: { name: 'Optimism Explorer', url: 'https://optimistic.etherscan.io/tx/' },
  137: { name: 'PolygonScan', url: 'https://polygonscan.com/tx/' },
  8453: { name: 'BaseScan', url: 'https://basescan.org/tx/' },
  42161: { name: 'Arbiscan', url: 'https://arbiscan.io/tx/' },
  43114: { name: 'SnowTrace', url: 'https://snowtrace.io/tx/' },
}

export function TransferStatus({
  txHash,
  sourceChain,
  destChain,
  amount,
  token = 'USDC',
  onClose,
}: TransferStatusProps) {
  const { status, isLoading, error } = useTransferStatus(txHash)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Track elapsed time
  useEffect(() => {
    if (!status || status.status === 'completed' || status.status === 'failed') return

    const startTime = new Date(status.created_at).getTime()
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [status])

  const displayInfo = getStatusDisplay(status)
  const sourceExplorer = CHAIN_EXPLORERS[sourceChain]
  const destExplorer = CHAIN_EXPLORERS[destChain]

  // Format elapsed time
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  if (isLoading && !status) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading transfer status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading transfer status: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${
        displayInfo.color === 'green' ? 'from-green-500 to-emerald-500' :
        displayInfo.color === 'blue' ? 'from-blue-500 to-cyan-500' :
        displayInfo.color === 'yellow' ? 'from-yellow-500 to-orange-500' :
        displayInfo.color === 'red' ? 'from-red-500 to-rose-500' :
        'from-gray-500 to-slate-500'
      }`} />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Transfer Status</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {displayInfo.progress === 100 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : displayInfo.progress === 0 && displayInfo.color === 'red' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            )}
            <span className="font-medium">{displayInfo.text}</span>
          </div>
          {status && status.status !== 'completed' && status.status !== 'failed' && (
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(elapsedTime)}
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 bg-gradient-to-r ${
              displayInfo.color === 'green' ? 'from-green-500 to-emerald-500' :
              displayInfo.color === 'blue' ? 'from-blue-500 to-cyan-500' :
              displayInfo.color === 'yellow' ? 'from-yellow-500 to-orange-500' :
              'from-gray-400 to-gray-500'
            }`}
            style={{ width: `${displayInfo.progress}%` }}
          />
        </div>

        {/* Description */}
        {displayInfo.description && (
          <p className="text-sm text-gray-600">{displayInfo.description}</p>
        )}

        {/* Transfer Details */}
        {status && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            {amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">{amount} {token}</span>
              </div>
            )}
            {status.event_nonce && (
              <div className="flex justify-between">
                <span className="text-gray-600">Nonce:</span>
                <span className="font-mono">{status.event_nonce}</span>
              </div>
            )}
            {status.has_attestation && (
              <div className="flex justify-between">
                <span className="text-gray-600">Attestation:</span>
                <Badge variant="outline" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Received
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Explorer Links */}
        <div className="flex gap-2">
          {sourceExplorer && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`${sourceExplorer.url}${txHash}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View on {sourceExplorer.name}
            </Button>
          )}
          {status?.status === 'completed' && destExplorer && status.recipient && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`${destExplorer.url.replace('/tx/', '/address/')}${status.recipient}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View on {destExplorer.name}
            </Button>
          )}
        </div>

        {/* CCTP Info */}
        {status && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-xs">
              <strong>CCTP V2 Fast Transfer</strong>
              <br />
              This transfer uses Circle's CCTP protocol with automated attestation relay
              for 8-20 second completion times.
            </AlertDescription>
          </Alert>
        )}

        {/* Completion Time */}
        {status?.completed_at && (
          <div className="text-center text-sm text-gray-600 pt-2 border-t">
            Total time: {formatTime(
              Math.floor((new Date(status.completed_at).getTime() - new Date(status.created_at).getTime()) / 1000)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
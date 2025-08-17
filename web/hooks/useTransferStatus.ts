import { useState, useEffect, useCallback } from 'react'
import { getTransferStatus, type TransferStatus } from '@/lib/relayer-api'

export function useTransferStatus(txHash: string | null, enabled: boolean = true) {
  const [status, setStatus] = useState<TransferStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!txHash || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getTransferStatus(txHash)
      setStatus(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [txHash, enabled])

  useEffect(() => {
    if (!txHash || !enabled) return

    // Initial fetch
    fetchStatus()

    // Poll for updates while transfer is pending
    const interval = setInterval(() => {
      if (status && (status.status === 'completed' || status.status === 'failed')) {
        clearInterval(interval)
        return
      }
      fetchStatus()
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [txHash, enabled, fetchStatus, status])

  return { status, isLoading, error, refetch: fetchStatus }
}

// Helper to get status display info
export function getStatusDisplay(status: TransferStatus | null) {
  if (!status) return { text: 'Unknown', color: 'gray', progress: 0 }

  switch (status.status) {
    case 'pending':
      return {
        text: 'Waiting for attestation...',
        color: 'yellow',
        progress: 25,
        description: 'Circle is processing your transfer',
      }
    case 'attested':
      return {
        text: 'Attestation received',
        color: 'blue',
        progress: 50,
        description: 'Preparing to mint USDC on destination',
      }
    case 'completing':
      return {
        text: 'Minting USDC...',
        color: 'blue',
        progress: 75,
        description: 'Completing transfer on destination chain',
      }
    case 'completed':
      return {
        text: 'Transfer complete!',
        color: 'green',
        progress: 100,
        description: 'USDC successfully delivered',
      }
    case 'failed':
      return {
        text: 'Transfer failed',
        color: 'red',
        progress: 0,
        description: 'Please contact support',
      }
    default:
      return { text: 'Processing...', color: 'gray', progress: 0 }
  }
}
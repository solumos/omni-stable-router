/**
 * Relayer API client for CCTP V2 automated attestation
 */

export interface MonitorTransferRequest {
  tx_hash: string
  source_chain: string
  dest_chain: string
}

export interface TransferStatus {
  tx_hash: string
  status: 'pending' | 'attested' | 'completing' | 'completed' | 'failed'
  source_domain: number
  dest_domain: number
  amount: number
  recipient: string | null
  event_nonce: number | null
  created_at: string
  completed_at: string | null
  has_attestation: boolean
}

// Map chain IDs to chain names for the API
const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: 'ethereum',
  10: 'optimism',
  137: 'polygon',
  8453: 'base',
  42161: 'arbitrum',
  43114: 'avalanche',
}

// Determine if a transfer will use CCTP based on tokens
export function isCCTPTransfer(
  sourceToken: string,
  destToken: string,
  sourceChain: number,
  destChain: number
): boolean {
  // CCTP is only for USDC transfers
  return sourceToken === 'USDC' && destToken === 'USDC' && sourceChain !== destChain
}

/**
 * Get the API base URL based on environment
 */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8000'
    }
    // Production - use the Omnistable API
    return process.env.NEXT_PUBLIC_API_URL || 'https://api.omnistable.xyz'
  }
  // Server-side
  return process.env.API_URL || 'http://localhost:8000'
}

/**
 * Register a CCTP transfer with the relayer for automated attestation
 */
export async function monitorTransfer(
  txHash: string,
  sourceChainId: number,
  destChainId: number
): Promise<TransferStatus> {
  const sourceChain = CHAIN_ID_TO_NAME[sourceChainId]
  const destChain = CHAIN_ID_TO_NAME[destChainId]
  
  if (!sourceChain || !destChain) {
    throw new Error(`Unsupported chain: ${sourceChainId} or ${destChainId}`)
  }
  
  const apiUrl = getApiBaseUrl()
  
  try {
    const response = await fetch(`${apiUrl}/relayer/monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_hash: txHash,
        source_chain: sourceChain,
        dest_chain: destChain,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to monitor transfer')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error registering transfer with relayer:', error)
    // Don't throw - relayer is optional enhancement
    // Transfer will still complete, just slower without automation
    return {
      tx_hash: txHash,
      status: 'pending',
      source_domain: sourceChainId,
      dest_domain: destChainId,
      amount: 0,
      recipient: null,
      event_nonce: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      has_attestation: false,
    }
  }
}

/**
 * Get the current status of a monitored transfer
 */
export async function getTransferStatus(txHash: string): Promise<TransferStatus | null> {
  const apiUrl = getApiBaseUrl()
  
  try {
    const response = await fetch(`${apiUrl}/relayer/status/${txHash}`)
    
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      throw new Error('Failed to get transfer status')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting transfer status:', error)
    return null
  }
}

/**
 * Poll for transfer completion
 */
export async function waitForTransferCompletion(
  txHash: string,
  options: {
    maxAttempts?: number
    intervalMs?: number
    onStatusUpdate?: (status: TransferStatus) => void
  } = {}
): Promise<TransferStatus> {
  const { maxAttempts = 60, intervalMs = 5000, onStatusUpdate } = options
  
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTransferStatus(txHash)
    
    if (status) {
      if (onStatusUpdate) {
        onStatusUpdate(status)
      }
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status
      }
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  
  throw new Error('Transfer completion timeout')
}

/**
 * Get relayer statistics
 */
export async function getRelayerStats() {
  const apiUrl = getApiBaseUrl()
  
  try {
    const response = await fetch(`${apiUrl}/relayer/stats`)
    
    if (!response.ok) {
      throw new Error('Failed to get relayer stats')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting relayer stats:', error)
    return null
  }
}
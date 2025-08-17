import { useEffect, useState } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { erc20Abi } from 'viem'
import { TOKENS, type TokenSymbol } from '@/lib/constants'

export function useTokenBalance(token: TokenSymbol, chainId: number) {
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId })
  const [balance, setBalance] = useState<bigint | null>(null)

  useEffect(() => {
    if (!address || !publicClient) {
      setBalance(null)
      return
    }

    const tokenData = TOKENS[token]
    if (!tokenData) {
      console.warn(`Token ${token} not found in TOKENS`)
      setBalance(null)
      return
    }

    const tokenAddress = tokenData.addresses[chainId]
    if (!tokenAddress) {
      console.warn(`Token ${token} not available on chain ${chainId}`)
      setBalance(null)
      return
    }

    const fetchBalance = async () => {
      try {
        console.log(`Fetching balance for token ${token} (${tokenAddress}) on chain ${chainId} for address ${address}`)
        
        // Validate address format
        if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
          throw new Error(`Invalid token address format: ${tokenAddress}`)
        }
        
        const result = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        setBalance(result)
      } catch (error) {
        console.error(`Failed to fetch balance for ${token} on chain ${chainId}:`, error)
        setBalance(null)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [address, publicClient, token, chainId])

  return balance
}
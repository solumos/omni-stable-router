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

    const tokenAddress = TOKENS[token].addresses[chainId as keyof typeof TOKENS[typeof token]['addresses']]
    if (!tokenAddress) {
      setBalance(null)
      return
    }

    const fetchBalance = async () => {
      try {
        const result = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        setBalance(result)
      } catch (error) {
        console.error('Failed to fetch balance:', error)
        setBalance(null)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [address, publicClient, token, chainId])

  return balance
}
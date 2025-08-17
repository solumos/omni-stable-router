import { type Address, erc20Abi } from 'viem'
import { getWalletClient, getPublicClient, waitForTransactionReceipt } from '@wagmi/core'
import { TOKENS, type TokenSymbol } from './constants'
import { UNIFIED_ROUTER_ADDRESSES, UNIFIED_ROUTER_ABI, Protocol } from './contracts'
import { config } from './wagmi'
import { isCCTPTransfer, monitorTransfer } from './relayer-api'

interface SwapParams {
  sourceToken: TokenSymbol
  destToken: TokenSymbol
  sourceChain: number
  destChain: number
  amount: bigint
  recipient: Address
  quote: any
}

export async function executeSwap(params: SwapParams) {
  const walletClient = await getWalletClient(config, { chainId: params.sourceChain })
  const publicClient = getPublicClient(config, { chainId: params.sourceChain })
  
  if (!walletClient || !publicClient) {
    throw new Error('Wallet or public client not available')
  }

  const routerAddress = UNIFIED_ROUTER_ADDRESSES[params.sourceChain]
  if (!routerAddress || routerAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`UnifiedRouter not deployed on chain ${params.sourceChain}`)
  }

  const sourceTokenAddress = TOKENS[params.sourceToken].addresses[
    params.sourceChain as keyof typeof TOKENS[typeof params.sourceToken]['addresses']
  ] as Address

  // Step 1: Approve token spending
  // Get current gas prices to avoid fee errors
  const gasPrice = await publicClient.getGasPrice()
  
  const approvalTx = await walletClient.writeContract({
    chain: null,
    address: sourceTokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [routerAddress, params.amount],
    // Use legacy gas pricing for Base to avoid EIP-1559 issues
    gasPrice: gasPrice,
    type: 'legacy' as any,
  })

  await waitForTransactionReceipt(config, {
    hash: approvalTx,
    chainId: params.sourceChain,
  })

  // Step 2: Get destination token address
  const destTokenAddress = TOKENS[params.destToken].addresses[
    params.destChain as keyof typeof TOKENS[typeof params.destToken]['addresses']
  ] as Address

  // Step 3: Execute the transfer
  // For same-chain swaps or cross-chain transfers with swaps, use transferWithSwap
  // For simple cross-chain transfers of same token, use transfer
  const isCrossChain = params.sourceChain !== params.destChain
  const isSwap = params.sourceToken !== params.destToken
  
  let swapTx
  if (!isCrossChain && !isSwap) {
    // Simple same-chain, same-token transfer (shouldn't happen in UI)
    throw new Error('Same chain, same token transfers not supported')
  } else if (isCrossChain && !isSwap) {
    // Cross-chain transfer of same token - use simple transfer function
    swapTx = await walletClient.writeContract({
      address: routerAddress,
      abi: UNIFIED_ROUTER_ABI,
      functionName: 'transfer',
      args: [
        sourceTokenAddress,  // fromToken
        destTokenAddress,    // toToken (same token, different chain)
        params.amount,       // amount
        BigInt(params.destChain), // toChainId
        params.recipient,    // recipient
      ],
      value: BigInt(0), // UnifiedRouter transfers don't require ETH payment
      chain: null,
      // Use legacy gas pricing for Base to avoid EIP-1559 issues
      gasPrice: gasPrice,
      type: 'legacy' as any,
    })
  } else {
    // Cross-chain with swap or same-chain swap - use transferWithSwap
    const minAmountOut = params.quote.estimatedOutput ? 
      params.quote.estimatedOutput * BigInt(97) / BigInt(100) : // 3% slippage
      BigInt(0)
    
    swapTx = await walletClient.writeContract({
      address: routerAddress,
      abi: UNIFIED_ROUTER_ABI,
      functionName: 'transferWithSwap',
      args: [
        sourceTokenAddress,  // fromToken
        destTokenAddress,    // toToken
        params.amount,       // amount
        BigInt(params.destChain), // toChainId
        params.recipient,    // recipient
        minAmountOut,        // minAmountOut
        '0x',               // swapData (empty for now)
      ],
      value: BigInt(0), // UnifiedRouter transfers don't require ETH payment
      chain: null,
      // Use legacy gas pricing for Base to avoid EIP-1559 issues
      gasPrice: gasPrice,
      type: 'legacy' as any,
    })
  }

  const receipt = await waitForTransactionReceipt(config, {
    hash: swapTx,
    chainId: params.sourceChain,
  })

  // Step 4: If this is a CCTP transfer, register it with the relayer for automated attestation
  if (isCCTPTransfer(params.sourceToken, params.destToken, params.sourceChain, params.destChain)) {
    console.log('🔄 CCTP transfer detected, registering with relayer for fast completion...')
    
    try {
      const status = await monitorTransfer(
        swapTx,
        params.sourceChain,
        params.destChain
      )
      
      console.log('✅ Transfer registered with relayer:', status)
      console.log('⚡ Expected completion: 8-20 seconds')
      
      // Store the monitored transfer info in the receipt for UI tracking
      ;(receipt as any).relayerMonitored = true
      ;(receipt as any).relayerStatus = status
    } catch (error) {
      console.warn('⚠️ Could not register with relayer, transfer will complete normally:', error)
      // Transfer will still complete without relayer, just slower (10-20 minutes)
    }
  }

  return receipt
}
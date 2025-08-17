import { type Address, erc20Abi } from 'viem'
import { getWalletClient, getPublicClient, waitForTransactionReceipt } from '@wagmi/core'
import { TOKENS, type TokenSymbol } from './constants'
import { STABLE_ROUTER_ADDRESSES, STABLE_ROUTER_ABI, Protocol } from './contracts'
import { config } from './wagmi'

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

  const routerAddress = STABLE_ROUTER_ADDRESSES[params.sourceChain]
  if (!routerAddress || routerAddress === '0x0000000000000000000000000000000000000000') {
    // For demo purposes, simulate the swap
    console.log('Demo mode: Simulating swap', params)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Demo swap completed!')
        resolve(true)
      }, 2000)
    })
  }

  const sourceTokenAddress = TOKENS[params.sourceToken].addresses[
    params.sourceChain as keyof typeof TOKENS[typeof params.sourceToken]['addresses']
  ] as Address

  // Step 1: Approve token spending
  const approvalTx = await walletClient.writeContract({
    chain: null,
    address: sourceTokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [routerAddress, params.amount],
  })

  await waitForTransactionReceipt(config, {
    hash: approvalTx,
    chainId: params.sourceChain,
  })

  // Step 2: Determine protocol
  let protocol = Protocol.CCTP
  if (params.sourceToken === 'USDC' && params.destToken !== 'USDC') {
    protocol = Protocol.CCTP_HOOKS
  } else if (params.sourceToken === 'USDT' || params.destToken === 'USDT') {
    protocol = Protocol.STARGATE
  } else if (params.sourceToken === params.destToken) {
    protocol = Protocol.LAYERZERO_OFT
  } else {
    protocol = Protocol.LZ_COMPOSER
  }

  // Step 3: Execute the swap
  const destTokenAddress = TOKENS[params.destToken].addresses[
    params.destChain as keyof typeof TOKENS[typeof params.destToken]['addresses']
  ] as Address

  const swapTx = await walletClient.writeContract({
    chain: null,
    address: routerAddress,
    abi: STABLE_ROUTER_ABI,
    functionName: 'executeRoute',
    args: [
      sourceTokenAddress,
      destTokenAddress,
      params.amount,
      BigInt(params.destChain),
      params.recipient,
      params.quote.estimatedOutput * BigInt(97) / BigInt(100), // 3% slippage
      '0x', // Empty route data for now
    ],
    value: params.quote.networkFee ? BigInt(params.quote.networkFee * 1e18) : BigInt(0),
  })

  const receipt = await waitForTransactionReceipt(config, {
    hash: swapTx,
    chainId: params.sourceChain,
  })

  return receipt
}
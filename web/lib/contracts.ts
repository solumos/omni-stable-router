import { type Address } from 'viem'
import contractsConfig from '@/config/contracts.json'

// Contract addresses per chain from config
export const STABLE_ROUTER_ADDRESSES: Record<number, Address> = Object.entries(
  contractsConfig.stableRouter
).reduce((acc, [chainId, address]) => {
  acc[Number(chainId)] = address as Address
  return acc
}, {} as Record<number, Address>)

export const ROUTE_PROCESSOR_ADDRESSES: Record<number, Address> = Object.entries(
  contractsConfig.routeProcessor
).reduce((acc, [chainId, address]) => {
  acc[Number(chainId)] = address as Address
  return acc
}, {} as Record<number, Address>)

export const CCTP_HOOK_RECEIVER_ADDRESSES: Record<number, Address> = Object.entries(
  contractsConfig.cctpHookReceiver
).reduce((acc, [chainId, address]) => {
  acc[Number(chainId)] = address as Address
  return acc
}, {} as Record<number, Address>)

// StableRouter ABI (simplified for frontend use)
export const STABLE_ROUTER_ABI = [
  {
    inputs: [
      { name: 'sourceToken', type: 'address' },
      { name: 'destToken', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'destChainId', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'routeData', type: 'bytes' },
    ],
    name: 'executeRoute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'sourceToken', type: 'address' },
      { name: 'destToken', type: 'address' },
      { name: 'sourceChain', type: 'uint256' },
      { name: 'destChain', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'getQuote',
    outputs: [
      { name: 'estimatedOutput', type: 'uint256' },
      { name: 'protocol', type: 'uint8' },
      { name: 'networkFee', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'destChainId', type: 'uint256' },
      { name: 'protocol', type: 'uint8' },
    ],
    name: 'estimateFee',
    outputs: [{ name: 'fee', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Protocol enum values (must match contract)
export enum Protocol {
  NONE = 0,
  CCTP = 1,
  LAYERZERO_OFT = 2,
  STARGATE = 3,
  LZ_COMPOSER = 4,
  CCTP_HOOKS = 5,
  STARGATE_SWAP = 6,
}
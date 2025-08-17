import { type Address } from 'viem'
import contractsConfig from '@/config/contracts.json'

// Import ABIs
import StableRouterABI from '@/config/abis/StableRouter.abi.json'
import RouteProcessorABI from '@/config/abis/RouteProcessor.abi.json'
import SwapExecutorABI from '@/config/abis/SwapExecutor.abi.json'
import FeeManagerABI from '@/config/abis/FeeManager.abi.json'
import CCTPHookReceiverABI from '@/config/abis/CCTPHookReceiver.abi.json'

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

// Export actual ABIs
export const STABLE_ROUTER_ABI = StableRouterABI as const
export const ROUTE_PROCESSOR_ABI = RouteProcessorABI as const
export const SWAP_EXECUTOR_ABI = SwapExecutorABI as const
export const FEE_MANAGER_ABI = FeeManagerABI as const
export const CCTP_HOOK_RECEIVER_ABI = CCTPHookReceiverABI as const


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
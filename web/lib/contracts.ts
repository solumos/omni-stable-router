import { type Address } from 'viem'
import contractsConfig from '@/config/contracts.json'

// Import ABIs
import UnifiedRouterABI from '@/config/abis/UnifiedRouter.abi.json'
import RouteProcessorABI from '@/config/abis/RouteProcessor.abi.json'
import SwapExecutorABI from '@/config/abis/SwapExecutor.abi.json'
import FeeManagerABI from '@/config/abis/FeeManager.abi.json'
import CCTPHookReceiverABI from '@/config/abis/CCTPHookReceiver.abi.json'

// Contract addresses per chain from config
export const UNIFIED_ROUTER_ADDRESSES: Record<number, Address> = Object.entries(
  contractsConfig.stableRouter  // Note: keeping the config key for compatibility
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
export const UNIFIED_ROUTER_ABI = UnifiedRouterABI
export const ROUTE_PROCESSOR_ABI = RouteProcessorABI
export const SWAP_EXECUTOR_ABI = SwapExecutorABI
export const FEE_MANAGER_ABI = FeeManagerABI
export const CCTP_HOOK_RECEIVER_ABI = CCTPHookReceiverABI

// Keep old export names for backward compatibility
export const STABLE_ROUTER_ABI = UnifiedRouterABI
export const STABLE_ROUTER_ADDRESSES = UNIFIED_ROUTER_ADDRESSES


// Protocol enum values (must match UnifiedRouter contract)
export enum Protocol {
  NONE = 0,
  CCTP = 1,
  CCTP_HOOKS = 2,
  LAYERZERO = 3,
  STARGATE = 4,
}
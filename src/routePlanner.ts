/**
 * Deterministic Route Planner for Native Stablecoin Routing
 * Based on issuer-native deployments only, no bridged assets
 */

export type Chain = 'arbitrum' | 'avalanche' | 'polygon' | 'base' | 'optimism';
export type Token = 'USDC' | 'PYUSD' | 'USDT' | 'DAI';

export interface ChainConfig {
  chainId: number;
  lzEndpointId: number;
  cctpDomain: number;
  nativeAssets: {
    USDC: boolean;
    PYUSD: boolean;
    USDT: boolean;
  };
  addresses: {
    USDC?: string;
    PYUSD?: string;
    USDT?: string;
  };
}

export interface Route {
  sourceChain: Chain;
  sourceToken: Token;
  destChain: Chain;
  destToken: Token;
  protocol: 'CCTP' | 'Stargate' | 'LayerZero';
  steps: RouteStep[];
  estimatedCost: string;
  estimatedTime: number; // seconds
  warnings: string[];
}

export interface RouteStep {
  action: 'swap' | 'bridge' | 'deliver';
  chain: Chain;
  fromToken?: Token;
  toToken?: Token;
  protocol?: string;
  reason?: string;
}

// Chain configurations based on native deployments
const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  arbitrum: {
    chainId: 42161,
    lzEndpointId: 30110,
    cctpDomain: 3,
    nativeAssets: {
      USDC: true,
      PYUSD: true,  // Native since July 17, 2025
      USDT: true,
      DAI: true,
    },
    addresses: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      PYUSD: '0x...', // TODO: Add actual Arbitrum PYUSD address
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    },
  },
  avalanche: {
    chainId: 43114,
    lzEndpointId: 30106,
    cctpDomain: 1,
    nativeAssets: {
      USDC: true,
      PYUSD: false, // Not issued on Avalanche
      USDT: true,
      DAI: true,
    },
    addresses: {
      USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      PYUSD: undefined,
      USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
      DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    },
  },
  polygon: {
    chainId: 137,
    lzEndpointId: 30109,
    cctpDomain: 7,
    nativeAssets: {
      USDC: true,
      PYUSD: false, // Not issued on Polygon
      USDT: true,
      DAI: true,
    },
    addresses: {
      USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      PYUSD: undefined,
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    },
  },
  base: {
    chainId: 8453,
    lzEndpointId: 30184,
    cctpDomain: 6,
    nativeAssets: {
      USDC: true,
      PYUSD: false, // Not issued on Base
      USDT: false,  // Bridged only on Base
      DAI: false,   // Not issued on Base
    },
    addresses: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      PYUSD: undefined,
      USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // Bridged version - avoid
      DAI: undefined,
    },
  },
  optimism: {
    chainId: 10,
    lzEndpointId: 30111,
    cctpDomain: 2,
    nativeAssets: {
      USDC: true,
      PYUSD: false, // Not issued on Optimism
      USDT: true,
      DAI: true,
    },
    addresses: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      PYUSD: undefined,
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    },
  },
};

/**
 * Main routing function - deterministic route planning
 */
export function planRoute(
  sourceChain: Chain,
  sourceToken: Token,
  destChain: Chain,
  destToken: Token
): Route {
  const sourceConfig = CHAIN_CONFIGS[sourceChain];
  const destConfig = CHAIN_CONFIGS[destChain];
  const steps: RouteStep[] = [];
  const warnings: string[] = [];
  
  // Rule 1: USDC to USDC - always use CCTP (cleanest, issuer-native)
  if (sourceToken === 'USDC' && destToken === 'USDC') {
    steps.push({
      action: 'bridge',
      chain: sourceChain,
      fromToken: 'USDC',
      toToken: 'USDC',
      protocol: 'CCTP',
      reason: 'Direct USDC transfer via native CCTP',
    });
    
    return {
      sourceChain,
      sourceToken,
      destChain,
      destToken,
      protocol: 'CCTP',
      steps,
      estimatedCost: '$0.10-0.30',
      estimatedTime: 10,
      warnings,
    };
  }
  
  // Rule 2: Delivering USDC on destination - route through CCTP
  if (destToken === 'USDC') {
    if (sourceToken !== 'USDC') {
      steps.push({
        action: 'swap',
        chain: sourceChain,
        fromToken: sourceToken,
        toToken: 'USDC',
        protocol: 'DEX',
        reason: `Swap ${sourceToken} to USDC for CCTP bridge`,
      });
    }
    
    steps.push({
      action: 'bridge',
      chain: sourceChain,
      fromToken: 'USDC',
      toToken: 'USDC',
      protocol: 'CCTP',
      reason: 'Bridge USDC via native CCTP',
    });
    
    return {
      sourceChain,
      sourceToken,
      destChain,
      destToken,
      protocol: 'CCTP',
      steps,
      estimatedCost: sourceToken === 'USDC' ? '$0.10-0.30' : '$0.30-0.50',
      estimatedTime: sourceToken === 'USDC' ? 10 : 20,
      warnings,
    };
  }
  
  // Rule 3: Delivering PYUSD - check if native on destination
  if (destToken === 'PYUSD') {
    if (!destConfig.nativeAssets.PYUSD) {
      // PYUSD not native on destination - route not available
      throw new Error(`Cannot deliver PYUSD to ${destChain} - token not available on this chain`);
    }
    
    // PYUSD is native (Ethereum or Arbitrum), route via USDC then swap
    if (sourceToken !== 'USDC') {
      steps.push({
        action: 'swap',
        chain: sourceChain,
        fromToken: sourceToken,
        toToken: 'USDC',
        protocol: 'DEX',
      });
    }
    
    steps.push({
      action: 'bridge',
      chain: sourceChain,
      fromToken: 'USDC',
      toToken: 'USDC',
      protocol: 'CCTP',
    });
    
    steps.push({
      action: 'swap',
      chain: destChain,
      fromToken: 'USDC',
      toToken: 'PYUSD',
      protocol: 'DEX',
      reason: 'Swap to native PYUSD on destination',
    });
    
    return {
      sourceChain,
      sourceToken,
      destChain,
      destToken,
      protocol: 'CCTP',
      steps,
      estimatedCost: '$0.40-0.60',
      estimatedTime: 30,
      warnings,
    };
  }
  
  // Rule 4: Delivering DAI - check if native on destination
  if (destToken === 'DAI') {
    if (!destConfig.nativeAssets.DAI) {
      // DAI not native on destination - route not available
      throw new Error(`Cannot deliver DAI to ${destChain} - token not available on this chain`);
    }
    
    // DAI is native on destination
    if (sourceToken === 'DAI' && sourceConfig.nativeAssets.DAI) {
      // Direct DAI to DAI via LayerZero
      steps.push({
        action: 'bridge',
        chain: sourceChain,
        fromToken: 'DAI',
        toToken: 'DAI',
        protocol: 'LayerZero',
        reason: 'Direct native DAI transfer via LayerZero',
      });
      
      return {
        sourceChain,
        sourceToken,
        destChain,
        destToken,
        protocol: 'LayerZero',
        steps,
        estimatedCost: '$0.40-0.60',
        estimatedTime: 35,
        warnings,
      };
    }
    
    // Route via USDC/CCTP then swap to DAI
    if (sourceToken !== 'USDC') {
      steps.push({
        action: 'swap',
        chain: sourceChain,
        fromToken: sourceToken,
        toToken: 'USDC',
        protocol: 'DEX',
      });
    }
    
    steps.push({
      action: 'bridge',
      chain: sourceChain,
      fromToken: 'USDC',
      toToken: 'USDC',
      protocol: 'CCTP',
    });
    
    steps.push({
      action: 'swap',
      chain: destChain,
      fromToken: 'USDC',
      toToken: 'DAI',
      protocol: 'DEX',
      reason: 'Swap to native DAI on destination',
    });
    
    return {
      sourceChain,
      sourceToken,
      destChain,
      destToken,
      protocol: 'CCTP',
      steps,
      estimatedCost: '$0.40-0.60',
      estimatedTime: 35,
      warnings,
    };
  }
  
  // Rule 5: Delivering USDT - check if native on destination
  if (destToken === 'USDT') {
    if (!destConfig.nativeAssets.USDT) {
      // USDT not native on destination - route not available
      throw new Error(`Cannot deliver USDT to ${destChain} - token not native on this chain`);
    }
    
    // USDT is native on destination
    if (sourceToken === 'USDT' && sourceConfig.nativeAssets.USDT) {
      // Direct USDT to USDT via Stargate
      steps.push({
        action: 'bridge',
        chain: sourceChain,
        fromToken: 'USDT',
        toToken: 'USDT',
        protocol: 'Stargate',
        reason: 'Direct native USDT transfer via Stargate',
      });
      
      return {
        sourceChain,
        sourceToken,
        destChain,
        destToken,
        protocol: 'Stargate',
        steps,
        estimatedCost: '$0.30-0.50',
        estimatedTime: 30,
        warnings,
      };
    }
    
    // Route via USDC/CCTP then swap to USDT
    if (sourceToken !== 'USDC') {
      steps.push({
        action: 'swap',
        chain: sourceChain,
        fromToken: sourceToken,
        toToken: 'USDC',
        protocol: 'DEX',
      });
    }
    
    steps.push({
      action: 'bridge',
      chain: sourceChain,
      fromToken: 'USDC',
      toToken: 'USDC',
      protocol: 'CCTP',
    });
    
    steps.push({
      action: 'swap',
      chain: destChain,
      fromToken: 'USDC',
      toToken: 'USDT',
      protocol: 'DEX',
      reason: 'Swap to native USDT on destination',
    });
    
    return {
      sourceChain,
      sourceToken,
      destChain,
      destToken,
      protocol: 'CCTP',
      steps,
      estimatedCost: '$0.40-0.60',
      estimatedTime: 30,
      warnings,
    };
  }
  
  // Default fallback
  throw new Error(`Unsupported route: ${sourceToken}@${sourceChain} → ${destToken}@${destChain}`);
}

/**
 * Get all possible routes (156 permutations with fallbacks)
 */
export function getAllRoutes(): Route[] {
  const chains: Chain[] = ['arbitrum', 'avalanche', 'polygon', 'base', 'optimism'];
  const tokens: Token[] = ['USDC', 'PYUSD', 'USDT', 'DAI'];
  const routes: Route[] = [];
  
  for (const sourceChain of chains) {
    for (const sourceToken of tokens) {
      // Skip if token not available on source chain
      if (!isTokenAvailable(sourceChain, sourceToken)) continue;
      
      for (const destChain of chains) {
        for (const destToken of tokens) {
          // Skip same chain transfers (not cross-chain)
          if (sourceChain === destChain) continue;
          
          try {
            const route = planRoute(sourceChain, sourceToken, destChain, destToken);
            routes.push(route);
          } catch (error) {
            // Skip unsupported routes
          }
        }
      }
    }
  }
  
  return routes;
}

/**
 * Check if a token is available (native or bridged) on a chain
 */
export function isTokenAvailable(chain: Chain, token: Token): boolean {
  const config = CHAIN_CONFIGS[chain];
  return config.addresses[token] !== undefined;
}

/**
 * Check if a token is native (not bridged) on a chain
 */
export function isTokenNative(chain: Chain, token: Token): boolean {
  const config = CHAIN_CONFIGS[chain];
  return config.nativeAssets[token];
}

/**
 * Check if a route is valid (destination token must be native)
 */
export function isRouteValid(
  sourceChain: Chain,
  sourceToken: Token,
  destChain: Chain,
  destToken: Token
): boolean {
  // Same chain routes not supported
  if (sourceChain === destChain) {
    return false;
  }
  
  // Source token must be available on source chain
  if (!isTokenAvailable(sourceChain, sourceToken)) {
    return false;
  }
  
  // Destination token must be NATIVE on destination chain
  if (!isTokenNative(destChain, destToken)) {
    return false;
  }
  
  return true;
}

/**
 * Get list of valid destination tokens for a given destination chain
 */
export function getValidDestinationTokens(destChain: Chain): Token[] {
  const config = CHAIN_CONFIGS[destChain];
  const validTokens: Token[] = [];
  
  if (config.nativeAssets.USDC) validTokens.push('USDC');
  if (config.nativeAssets.PYUSD) validTokens.push('PYUSD');
  if (config.nativeAssets.USDT) validTokens.push('USDT');
  if (config.nativeAssets.DAI) validTokens.push('DAI');
  
  return validTokens;
}

/**
 * Get optimal route recommendation
 */
export function getRouteRecommendation(route: Route): string {
  const warnings = route.warnings.length > 0 
    ? `\n⚠️ ${route.warnings.join('\n⚠️ ')}` 
    : '';
    
  const steps = route.steps
    .map((s, i) => `${i + 1}. ${describeStep(s)}`)
    .join('\n');
    
  return `
Route: ${route.sourceToken}@${route.sourceChain} → ${route.destToken}@${route.destChain}
Protocol: ${route.protocol}
Cost: ${route.estimatedCost}
Time: ~${route.estimatedTime} seconds

Steps:
${steps}${warnings}
`.trim();
}

function describeStep(step: RouteStep): string {
  switch (step.action) {
    case 'swap':
      return `Swap ${step.fromToken} → ${step.toToken} on ${step.chain} (${step.protocol})`;
    case 'bridge':
      return `Bridge ${step.fromToken} via ${step.protocol} (${step.reason || ''})`.trim();
    case 'deliver':
      return `Deliver ${step.toToken} to recipient (${step.reason || ''})`.trim();
    default:
      return '';
  }
}

// Export for use in other modules
export default {
  planRoute,
  getAllRoutes,
  isTokenAvailable,
  isTokenNative,
  getRouteRecommendation,
  CHAIN_CONFIGS,
};
#!/usr/bin/env node

import { 
  planRoute, 
  isRouteValid,
  getValidDestinationTokens,
  isTokenNative
} from '../src/routePlanner.ts';

console.log('🚀 Testing Native-Only Route Validation\n');
console.log('=' .repeat(50));

// Test cases for invalid routes that should be rejected
const invalidRoutes = [
  { from: 'arbitrum', fromToken: 'PYUSD', to: 'base', toToken: 'PYUSD', reason: 'PYUSD not on Base' },
  { from: 'arbitrum', fromToken: 'USDT', to: 'base', toToken: 'USDT', reason: 'USDT bridged-only on Base' },
  { from: 'polygon', fromToken: 'DAI', to: 'base', toToken: 'DAI', reason: 'DAI not on Base' },
  { from: 'avalanche', fromToken: 'USDC', to: 'polygon', toToken: 'PYUSD', reason: 'PYUSD not on Polygon' },
];

console.log('\n❌ Testing Invalid Routes (should be rejected):');
for (const route of invalidRoutes) {
  const isValid = isRouteValid(route.from, route.fromToken, route.to, route.toToken);
  console.log(`  ${route.fromToken}@${route.from} → ${route.toToken}@${route.to}: ${isValid ? '⚠️ ALLOWED (ERROR!)' : '✅ REJECTED'} - ${route.reason}`);
  
  // Try to plan the route and verify it throws
  try {
    planRoute(route.from, route.fromToken, route.to, route.toToken);
    console.log(`    ⚠️ ERROR: Route was planned when it should have been rejected!`);
  } catch (error) {
    console.log(`    ✅ Correctly throws: "${error.message}"`);
  }
}

// Test valid routes
const validRoutes = [
  { from: 'arbitrum', fromToken: 'USDC', to: 'base', toToken: 'USDC', protocol: 'CCTP' },
  { from: 'avalanche', fromToken: 'USDC', to: 'arbitrum', toToken: 'PYUSD', protocol: 'CCTP' },
  { from: 'arbitrum', fromToken: 'USDT', to: 'polygon', toToken: 'USDT', protocol: 'Stargate' },
  { from: 'polygon', fromToken: 'DAI', to: 'avalanche', toToken: 'DAI', protocol: 'LayerZero' },
];

console.log('\n✅ Testing Valid Routes:');
for (const route of validRoutes) {
  const isValid = isRouteValid(route.from, route.fromToken, route.to, route.toToken);
  console.log(`  ${route.fromToken}@${route.from} → ${route.toToken}@${route.to}: ${isValid ? '✅ VALID' : '❌ INVALID (ERROR!)'}`);
  
  if (isValid) {
    try {
      const plannedRoute = planRoute(route.from, route.fromToken, route.to, route.toToken);
      console.log(`    Protocol: ${plannedRoute.protocol}, Steps: ${plannedRoute.steps.length}, Cost: ${plannedRoute.estimatedCost}`);
    } catch (error) {
      console.log(`    ❌ ERROR: ${error.message}`);
    }
  }
}

// Show valid tokens per chain
console.log('\n📊 Native Tokens by Chain:');
const chains = ['arbitrum', 'avalanche', 'polygon', 'base', 'optimism'];
for (const chain of chains) {
  const validTokens = getValidDestinationTokens(chain);
  console.log(`  ${chain}: ${validTokens.join(', ') || 'None'}`);
}

// Count total valid routes
console.log('\n📈 Route Statistics:');
let validCount = 0;
let invalidCount = 0;
const tokens = ['USDC', 'PYUSD', 'USDT', 'DAI'];

for (const sourceChain of chains) {
  for (const sourceToken of tokens) {
    for (const destChain of chains) {
      for (const destToken of tokens) {
        if (sourceChain === destChain) continue;
        
        if (isRouteValid(sourceChain, sourceToken, destChain, destToken)) {
          validCount++;
        } else {
          invalidCount++;
        }
      }
    }
  }
}

console.log(`  Total cross-chain permutations: ${validCount + invalidCount}`);
console.log(`  Valid routes: ${validCount} ✅`);
console.log(`  Invalid routes: ${invalidCount} ❌`);
console.log(`  Success rate: ${((validCount / (validCount + invalidCount)) * 100).toFixed(1)}%`);

console.log('\n✨ All route validation tests complete!');
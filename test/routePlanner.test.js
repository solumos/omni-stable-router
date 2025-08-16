import { expect } from 'chai';
import { 
  planRoute, 
  isRouteValid,
  isTokenNative,
  getValidDestinationTokens 
} from '../src/routePlanner.js';

describe('Route Planner - Native Only Routes', () => {
  
  describe('Route Validation', () => {
    it('should allow USDC to USDC on any chain', () => {
      expect(isRouteValid('arbitrum', 'USDC', 'base', 'USDC')).to.be.true;
      expect(isRouteValid('base', 'USDC', 'polygon', 'USDC')).to.be.true;
      expect(isRouteValid('avalanche', 'USDC', 'optimism', 'USDC')).to.be.true;
    });

    it('should allow PYUSD delivery only to Arbitrum', () => {
      expect(isRouteValid('base', 'USDC', 'arbitrum', 'PYUSD')).to.be.true;
      expect(isRouteValid('polygon', 'USDC', 'arbitrum', 'PYUSD')).to.be.true;
    });

    it('should reject PYUSD delivery to non-Arbitrum chains', () => {
      expect(isRouteValid('arbitrum', 'PYUSD', 'base', 'PYUSD')).to.be.false;
      expect(isRouteValid('arbitrum', 'PYUSD', 'avalanche', 'PYUSD')).to.be.false;
      expect(isRouteValid('arbitrum', 'PYUSD', 'polygon', 'PYUSD')).to.be.false;
    });

    it('should reject USDT delivery to Base (bridged only)', () => {
      expect(isRouteValid('arbitrum', 'USDT', 'base', 'USDT')).to.be.false;
      expect(isRouteValid('avalanche', 'USDT', 'base', 'USDT')).to.be.false;
    });

    it('should reject DAI delivery to Base (not available)', () => {
      expect(isRouteValid('arbitrum', 'DAI', 'base', 'DAI')).to.be.false;
      expect(isRouteValid('polygon', 'DAI', 'base', 'DAI')).to.be.false;
    });

    it('should allow native USDT transfers between supported chains', () => {
      expect(isRouteValid('arbitrum', 'USDT', 'avalanche', 'USDT')).to.be.true;
      expect(isRouteValid('polygon', 'USDT', 'optimism', 'USDT')).to.be.true;
    });

    it('should reject same-chain transfers', () => {
      expect(isRouteValid('arbitrum', 'USDC', 'arbitrum', 'USDC')).to.be.false;
      expect(isRouteValid('base', 'USDC', 'base', 'USDC')).to.be.false;
    });
  });

  describe('Route Planning', () => {
    it('should throw error for invalid PYUSD routes', () => {
      expect(() => planRoute('arbitrum', 'PYUSD', 'base', 'PYUSD'))
        .to.throw('Cannot deliver PYUSD to base - token not available on this chain');
      expect(() => planRoute('arbitrum', 'PYUSD', 'avalanche', 'PYUSD'))
        .to.throw('Cannot deliver PYUSD to avalanche - token not available on this chain');
    });

    it('should throw error for USDT to Base', () => {
      expect(() => planRoute('arbitrum', 'USDT', 'base', 'USDT'))
        .to.throw('Cannot deliver USDT to base - token not native on this chain');
    });

    it('should throw error for DAI to Base', () => {
      expect(() => planRoute('arbitrum', 'DAI', 'base', 'DAI'))
        .to.throw('Cannot deliver DAI to base - token not available on this chain');
    });

    it('should successfully plan USDC routes', () => {
      const route = planRoute('arbitrum', 'USDC', 'base', 'USDC');
      expect(route.protocol).to.equal('CCTP');
      expect(route.steps).to.have.lengthOf(1);
      expect(route.steps[0].action).to.equal('bridge');
    });

    it('should plan complex routes via USDC', () => {
      const route = planRoute('avalanche', 'USDT', 'arbitrum', 'PYUSD');
      expect(route.steps).to.have.length.greaterThan(1);
      expect(route.steps.some(s => s.toToken === 'USDC')).to.be.true;
    });
  });

  describe('Token Availability', () => {
    it('should correctly identify native tokens', () => {
      expect(isTokenNative('arbitrum', 'PYUSD')).to.be.true;
      expect(isTokenNative('base', 'PYUSD')).to.be.false;
      expect(isTokenNative('base', 'USDT')).to.be.false;
      expect(isTokenNative('base', 'USDC')).to.be.true;
      expect(isTokenNative('avalanche', 'USDT')).to.be.true;
    });

    it('should return valid destination tokens for each chain', () => {
      const baseTokens = getValidDestinationTokens('base');
      expect(baseTokens).to.deep.equal(['USDC']);

      const arbitrumTokens = getValidDestinationTokens('arbitrum');
      expect(arbitrumTokens).to.include.members(['USDC', 'PYUSD', 'USDT', 'DAI']);

      const avalancheTokens = getValidDestinationTokens('avalanche');
      expect(avalancheTokens).to.include.members(['USDC', 'USDT', 'DAI']);
      expect(avalancheTokens).to.not.include('PYUSD');
    });
  });

  describe('Statistics', () => {
    it('should have exactly 49 valid routes', () => {
      const chains = ['arbitrum', 'avalanche', 'polygon', 'base', 'optimism'];
      const tokens = ['USDC', 'PYUSD', 'USDT', 'DAI'];
      let validCount = 0;

      for (const sourceChain of chains) {
        for (const sourceToken of tokens) {
          for (const destChain of chains) {
            for (const destToken of tokens) {
              if (sourceChain === destChain) continue;
              if (isRouteValid(sourceChain, sourceToken, destChain, destToken)) {
                validCount++;
              }
            }
          }
        }
      }

      expect(validCount).to.equal(49);
    });
  });
});
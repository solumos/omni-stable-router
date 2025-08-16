import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle, Check } from 'lucide-react';

// ============ Types ============
interface Network {
  id: number;
  name: string;
  icon: string;
  chainId: number;
  lzEndpointId: number;
  nativeTokens: Token[];
  rpcUrl: string;
  explorerUrl: string;
  color: string;
}

interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string;
  isNative: boolean;
  chainId: number;
}

interface Route {
  available: boolean;
  protocol: 'CCTP' | 'LayerZero' | 'Stargate';
  estimatedTime: number;
  estimatedCost: string;
  warning?: string;
}

// ============ Configuration ============
const NETWORKS: Network[] = [
  {
    id: 1,
    name: 'Ethereum',
    icon: '⟠',
    chainId: 1,
    lzEndpointId: 30101,
    color: 'bg-blue-500',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeTokens: [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        decimals: 6,
        icon: '💵',
        isNative: true,
        chainId: 1
      },
      {
        symbol: 'PYUSD',
        name: 'PayPal USD',
        address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
        decimals: 6,
        icon: '🅿️',
        isNative: true,
        chainId: 1
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        decimals: 6,
        icon: '💲',
        isNative: true,
        chainId: 1
      }
    ]
  },
  {
    id: 8453,
    name: 'Base',
    icon: '🔵',
    chainId: 8453,
    lzEndpointId: 30184,
    color: 'bg-blue-600',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeTokens: [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        icon: '💵',
        isNative: true,
        chainId: 8453
      }
    ]
  },
  {
    id: 43114,
    name: 'Avalanche',
    icon: '🔺',
    chainId: 43114,
    lzEndpointId: 30106,
    color: 'bg-red-500',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    nativeTokens: [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        decimals: 6,
        icon: '💵',
        isNative: true,
        chainId: 43114
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        decimals: 6,
        icon: '💲',
        isNative: true,
        chainId: 43114
      }
    ]
  },
  {
    id: 42161,
    name: 'Arbitrum',
    icon: '🅰️',
    chainId: 42161,
    lzEndpointId: 30110,
    color: 'bg-blue-400',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeTokens: [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        decimals: 6,
        icon: '💵',
        isNative: true,
        chainId: 42161
      },
      {
        symbol: 'PYUSD',
        name: 'PayPal USD',
        address: '0x...', // TODO: Add actual address
        decimals: 6,
        icon: '🅿️',
        isNative: true,
        chainId: 42161
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        decimals: 6,
        icon: '💲',
        isNative: true,
        chainId: 42161
      }
    ]
  }
];

// ============ Helper Functions ============
function getRouteInfo(
  sourceToken: Token | null,
  sourceNetwork: Network | null,
  destToken: Token | null,
  destNetwork: Network | null
): Route | null {
  if (!sourceToken || !sourceNetwork || !destToken || !destNetwork) {
    return null;
  }

  // Same chain - not supported
  if (sourceNetwork.chainId === destNetwork.chainId) {
    return {
      available: false,
      protocol: 'CCTP',
      estimatedTime: 0,
      estimatedCost: '0',
      warning: 'Same chain transfers not supported'
    };
  }

  // Check if destination token is native on destination chain
  const destTokenNative = destNetwork.nativeTokens.some(t => t.symbol === destToken.symbol);
  if (!destTokenNative) {
    return {
      available: false,
      protocol: 'CCTP',
      estimatedTime: 0,
      estimatedCost: '0',
      warning: `${destToken.symbol} not available on ${destNetwork.name}`
    };
  }

  // USDC to USDC - always CCTP
  if (sourceToken.symbol === 'USDC' && destToken.symbol === 'USDC') {
    return {
      available: true,
      protocol: 'CCTP',
      estimatedTime: 10,
      estimatedCost: '$0.10-0.30'
    };
  }

  // USDT to USDT on native chains
  if (sourceToken.symbol === 'USDT' && destToken.symbol === 'USDT') {
    const sourceNative = sourceToken.isNative;
    const destNative = destNetwork.nativeTokens.find(t => t.symbol === 'USDT')?.isNative;
    
    if (sourceNative && destNative) {
      return {
        available: true,
        protocol: 'Stargate',
        estimatedTime: 30,
        estimatedCost: '$0.30-0.50'
      };
    }
  }

  // Default: Route through USDC
  return {
    available: true,
    protocol: 'LayerZero',
    estimatedTime: 30,
    estimatedCost: '$0.40-0.60'
  };
}

// ============ Components ============
interface SelectorProps {
  label: string;
  value: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

const Selector: React.FC<SelectorProps> = ({ label, value, icon, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full p-4 rounded-xl border-2 transition-all
      ${disabled 
        ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
        : 'border-gray-300 hover:border-blue-500 bg-white cursor-pointer'
      }
    `}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon && <span className="text-2xl">{icon}</span>}
        <div className="text-left">
          <div className="text-xs text-gray-500 font-medium">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </div>
      <ChevronDown className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-gray-600'}`} />
    </div>
  </button>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ============ Main Component ============
export const TokenNetworkSelector: React.FC = () => {
  const [sourceNetwork, setSourceNetwork] = useState<Network | null>(NETWORKS[0]);
  const [sourceToken, setSourceToken] = useState<Token | null>(NETWORKS[0].nativeTokens[0]);
  const [destNetwork, setDestNetwork] = useState<Network | null>(NETWORKS[1]);
  const [destToken, setDestToken] = useState<Token | null>(NETWORKS[1].nativeTokens[0]);
  
  const [showSourceNetworkModal, setShowSourceNetworkModal] = useState(false);
  const [showSourceTokenModal, setShowSourceTokenModal] = useState(false);
  const [showDestNetworkModal, setShowDestNetworkModal] = useState(false);
  const [showDestTokenModal, setShowDestTokenModal] = useState(false);
  
  const [amount, setAmount] = useState('');
  
  const routeInfo = getRouteInfo(sourceToken, sourceNetwork, destToken, destNetwork);

  // Update tokens when network changes
  useEffect(() => {
    if (sourceNetwork && !sourceNetwork.nativeTokens.find(t => t.symbol === sourceToken?.symbol)) {
      setSourceToken(sourceNetwork.nativeTokens[0]);
    }
  }, [sourceNetwork]);

  useEffect(() => {
    if (destNetwork && !destNetwork.nativeTokens.find(t => t.symbol === destToken?.symbol)) {
      setDestToken(destNetwork.nativeTokens[0]);
    }
  }, [destNetwork]);

  const handleSwapNetworks = () => {
    const tempNetwork = sourceNetwork;
    const tempToken = sourceToken;
    setSourceNetwork(destNetwork);
    setSourceToken(destToken);
    setDestNetwork(tempNetwork);
    setDestToken(tempToken);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold mb-6">Cross-Chain Payment</h2>
      
      {/* Source Section */}
      <div className="space-y-4 mb-6">
        <label className="text-sm font-medium text-gray-600">From</label>
        
        <Selector
          label="Network"
          value={sourceNetwork?.name || 'Select Network'}
          icon={sourceNetwork?.icon}
          onClick={() => setShowSourceNetworkModal(true)}
        />
        
        <Selector
          label="Token"
          value={sourceToken?.symbol || 'Select Token'}
          icon={sourceToken?.icon}
          onClick={() => setShowSourceTokenModal(true)}
          disabled={!sourceNetwork}
        />
        
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-4 pr-20 rounded-xl border-2 border-gray-300 focus:border-blue-500 outline-none text-lg font-semibold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            {sourceToken?.symbol || 'USD'}
          </span>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleSwapNetworks}
          className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Destination Section */}
      <div className="space-y-4 mb-6">
        <label className="text-sm font-medium text-gray-600">To</label>
        
        <Selector
          label="Network"
          value={destNetwork?.name || 'Select Network'}
          icon={destNetwork?.icon}
          onClick={() => setShowDestNetworkModal(true)}
        />
        
        <Selector
          label="Token"
          value={destToken?.symbol || 'Select Token'}
          icon={destToken?.icon}
          onClick={() => setShowDestTokenModal(true)}
          disabled={!destNetwork}
        />
      </div>

      {/* Route Information */}
      {routeInfo && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="space-y-2">
            {routeInfo.warning && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-800">{routeInfo.warning}</p>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Route</span>
              <span className="font-medium">{routeInfo.protocol}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated Time</span>
              <span className="font-medium">~{routeInfo.estimatedTime} seconds</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated Cost</span>
              <span className="font-medium">{routeInfo.estimatedCost}</span>
            </div>
          </div>
        </div>
      )}

      {/* Send Button */}
      <button
        disabled={!routeInfo?.available || !amount}
        className={`
          w-full py-4 rounded-xl font-semibold text-white transition-all
          ${routeInfo?.available && amount
            ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            : 'bg-gray-300 cursor-not-allowed'
          }
        `}
      >
        {!routeInfo?.available 
          ? 'Route Not Available' 
          : !amount 
          ? 'Enter Amount'
          : 'Send Payment'
        }
      </button>

      {/* Network Selection Modal */}
      <Modal
        isOpen={showSourceNetworkModal}
        onClose={() => setShowSourceNetworkModal(false)}
        title="Select Source Network"
      >
        <div className="space-y-2">
          {NETWORKS.map((network) => (
            <button
              key={network.id}
              onClick={() => {
                setSourceNetwork(network);
                setShowSourceNetworkModal(false);
              }}
              className="w-full p-4 rounded-xl hover:bg-gray-50 flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{network.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{network.name}</div>
                  <div className="text-xs text-gray-500">
                    {network.nativeTokens.map(t => t.symbol).join(', ')}
                  </div>
                </div>
              </div>
              {sourceNetwork?.id === network.id && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Token Selection Modal */}
      <Modal
        isOpen={showSourceTokenModal}
        onClose={() => setShowSourceTokenModal(false)}
        title="Select Token"
      >
        <div className="space-y-2">
          {sourceNetwork?.nativeTokens.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                setSourceToken(token);
                setShowSourceTokenModal(false);
              }}
              className="w-full p-4 rounded-xl hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{token.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{token.symbol}</div>
                  <div className="text-xs text-gray-500">{token.name}</div>
                </div>
              </div>
              {sourceToken?.symbol === token.symbol && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Destination Network Modal */}
      <Modal
        isOpen={showDestNetworkModal}
        onClose={() => setShowDestNetworkModal(false)}
        title="Select Destination Network"
      >
        <div className="space-y-2">
          {NETWORKS.map((network) => (
            <button
              key={network.id}
              onClick={() => {
                setDestNetwork(network);
                setShowDestNetworkModal(false);
              }}
              className="w-full p-4 rounded-xl hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{network.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{network.name}</div>
                  <div className="text-xs text-gray-500">
                    {network.nativeTokens.map(t => t.symbol).join(', ')}
                  </div>
                </div>
              </div>
              {destNetwork?.id === network.id && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      </Modal>

      {/* Destination Token Modal */}
      <Modal
        isOpen={showDestTokenModal}
        onClose={() => setShowDestTokenModal(false)}
        title="Select Token"
      >
        <div className="space-y-2">
          {/* Only show native tokens for the destination chain */}
          {destNetwork?.nativeTokens.map((token) => (
            <button
              key={token.address}
              onClick={() => {
                setDestToken(token);
                setShowDestTokenModal(false);
              }}
              className="w-full p-4 rounded-xl hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{token.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{token.symbol}</div>
                  <div className="text-xs text-gray-500">{token.name}</div>
                </div>
              </div>
              {destToken?.symbol === token.symbol && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </button>
          ))}
          
          {/* Show message if limited tokens available */}
          {destNetwork?.nativeTokens.length === 1 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Only {destNetwork.nativeTokens[0].symbol} is available on {destNetwork.name}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TokenNetworkSelector;
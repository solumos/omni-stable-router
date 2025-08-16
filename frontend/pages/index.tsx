import { ConnectKitButton } from 'connectkit';
import TokenNetworkSelector from '../components/TokenNetworkSelector';
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stablecoin Router</h1>
          <p className="text-sm text-gray-600">Native-only cross-chain payments</p>
        </div>
        <ConnectKitButton />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {isConnected ? (
          <TokenNetworkSelector />
        ) : (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-600 mb-6">
                Connect your wallet to start making cross-chain payments with native stablecoins.
              </p>
              <ConnectKitButton />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full p-6 text-center text-sm text-gray-600">
        <div className="space-y-2">
          <p>Powered by Circle CCTP v2 & LayerZero Composer</p>
          <p className="text-xs">
            USDC always via CCTP • PYUSD/USDT via LayerZero • No bridged assets
          </p>
        </div>
      </footer>
    </div>
  );
}
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { localhost, mainnet, base, avalanche, arbitrum } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';

const config = createConfig(
  getDefaultConfig({
    chains: [localhost, mainnet, base, avalanche, arbitrum],
    transports: {
      [localhost.id]: http('http://localhost:8545'),
      [mainnet.id]: http(),
      [base.id]: http(),
      [avalanche.id]: http(),
      [arbitrum.id]: http(),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '',
    appName: 'Stablecoin Router',
    appDescription: 'Cross-chain stablecoin payments',
  })
);

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="rounded">
          <Component {...pageProps} />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
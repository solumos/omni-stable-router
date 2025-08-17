'use client'

import { SwapInterface } from '@/components/SwapInterface'
import { Header } from '@/components/Header'
import { LogoAnimated } from '@/components/Logo'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl">
                  <LogoAnimated className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">OmniStable</span>
              <span className="text-gray-800"> Router</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              The most efficient cross-chain stablecoin exchange. Swap USDC, PYUSD, and USDe across Ethereum, Arbitrum, and Base.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Live on Mainnet</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Low Fees</span>
              </div>
            </div>
          </div>
          <SwapInterface />
        </div>
      </main>
    </div>
  )
}
'use client'

import { SwapInterface } from '@/components/SwapInterface'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">OmniStable</span>
              <span className="text-gray-800"> Router</span>
            </h1>
            <p className="text-lg text-gray-600">
              Swap stablecoins across multiple chains with the best rates and lowest fees
            </p>
          </div>
          <SwapInterface />
        </div>
      </main>
    </div>
  )
}
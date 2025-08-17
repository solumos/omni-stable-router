'use client'

import { Header } from '@/components/Header'
import { LogoAnimated } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeftRight, DollarSign, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
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
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The most efficient cross-chain stablecoin exchange. Swap USDC, PYUSD, USDe, and crvUSD across Ethereum, Arbitrum, Base, and Avalanche.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 w-fit group-hover:scale-110 transition-transform">
                  <ArrowLeftRight className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Cross-Chain Swap</CardTitle>
                <CardDescription className="text-base">
                  Exchange stablecoins across multiple chains with the best rates and lowest fees
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0">
                  <Link href="/swap" className="flex items-center justify-center gap-2">
                    Start Swapping
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/60 backdrop-blur">
              <CardHeader className="text-center space-y-4">
                <div className="mx-auto p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 w-fit group-hover:scale-110 transition-transform">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Payment Request</CardTitle>
                <CardDescription className="text-base">
                  Create payment links and QR codes for easy cross-chain stablecoin payments
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0">
                  <Link href="/request" className="flex items-center justify-center gap-2">
                    Create Request
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
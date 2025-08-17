'use client'

import { Suspense } from 'react'
import { Header } from '@/components/Header'
import { SendInterface } from '@/components/SendInterface'
import { LogoAnimated } from '@/components/Logo'

function SendPageContent() {
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
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Send</span>
              <span className="text-gray-800"> Payment</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Complete this payment request by selecting your preferred token and chain.
            </p>
          </div>
          <SendInterface />
        </div>
      </main>
    </div>
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SendPageContent />
    </Suspense>
  )
}
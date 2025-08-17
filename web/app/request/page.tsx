'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { RequestInterface } from '@/components/RequestInterface'

export default function RequestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-lg mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Request</span>
              <span className="text-gray-800"> Payment</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Create a payment request link that allows others to send you stablecoins across any supported chain.
            </p>
          </div>
          <RequestInterface />
        </div>
      </main>
    </div>
  )
}
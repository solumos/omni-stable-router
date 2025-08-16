'use client'

import { useState } from 'react'
import { SwapInterface } from '@/components/SwapInterface'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            StableRouter
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Cross-chain stablecoin swaps with the best rates
          </p>
          <SwapInterface />
        </div>
      </main>
    </div>
  )
}
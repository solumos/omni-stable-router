'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { ReceiveInterface } from '@/components/ReceiveInterface'
import { PaymentInterface } from '@/components/PaymentInterface'

export default function ReceivePage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('id')

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {paymentId ? (
            <PaymentInterface paymentId={paymentId} />
          ) : (
            <ReceiveInterface />
          )}
        </div>
      </main>
    </div>
  )
}
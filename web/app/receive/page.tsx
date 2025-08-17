'use client'

import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { ReceiveInterface } from '@/components/ReceiveInterface'
import { PaymentInterface } from '@/components/PaymentInterface'

export default function ReceivePage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('id')

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main className="container mx-auto px-4 py-12">
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
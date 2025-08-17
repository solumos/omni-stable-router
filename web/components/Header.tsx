'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import Image from 'next/image'
import { Send, ArrowLeftRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                OmniStable
              </span>
              <span className="text-2xl font-light text-gray-600">
                Router
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Swap
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/receive" className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Receive
              </Link>
            </Button>
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  )
}
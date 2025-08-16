'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { Send } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            StableRouter
          </Link>
          <nav className="hidden md:flex gap-4">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Swap
            </Link>
            <Link
              href="/receive"
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              Receive
            </Link>
          </nav>
        </div>
        <ConnectButton />
      </div>
    </header>
  )
}
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TOKENS, type TokenSymbol } from '@/lib/constants'

interface TokenSelectorProps {
  value: TokenSymbol
  onChange: (token: TokenSymbol) => void
  tokens: TokenSymbol[]
}

export function TokenSelector({ value, onChange, tokens }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
      >
        <span className="font-semibold">{value}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
            {tokens.map((token) => (
              <button
                key={token}
                onClick={() => {
                  onChange(token)
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="font-semibold">{token}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {TOKENS[token].name}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
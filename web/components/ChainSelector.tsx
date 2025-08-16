'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { CHAINS } from '@/lib/constants'

interface ChainSelectorProps {
  value: number
  onChange: (chainId: number) => void
}

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedChain = Object.values(CHAINS).find(c => c.id === value)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-sm"
      >
        <span>{selectedChain?.name}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-20">
            {Object.values(CHAINS).map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onChange(chain.id)
                  setIsOpen(false)
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg text-sm"
              >
                {chain.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
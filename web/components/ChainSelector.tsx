'use client'

import { CHAINS } from '@/lib/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Globe } from 'lucide-react'

interface ChainSelectorProps {
  value: number
  onChange: (chainId: number) => void
}

const CHAIN_COLORS: Record<number, string> = {
  1: 'from-gray-600 to-gray-800',
  10: 'from-red-500 to-red-700',
  137: 'from-purple-500 to-purple-700',
  8453: 'from-blue-500 to-blue-700',
  42161: 'from-blue-600 to-indigo-700',
  43114: 'from-red-600 to-red-800',
  11155111: 'from-gray-500 to-gray-700',
  84532: 'from-blue-400 to-blue-600',
}

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  const selectedChain = Object.values(CHAINS).find(c => c.id === value)

  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-full">
        <SelectValue>
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${CHAIN_COLORS[value] || 'from-gray-400 to-gray-600'}`} />
            <span className="font-medium">{selectedChain?.name}</span>
            {(value === 11155111 || value === 84532) && (
              <Badge variant="secondary" className="ml-auto text-xs">Testnet</Badge>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.values(CHAINS).map((chain) => (
          <SelectItem key={chain.id} value={chain.id.toString()}>
            <div className="flex items-center gap-2 w-full">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${CHAIN_COLORS[chain.id] || 'from-gray-400 to-gray-600'}`} />
              <span>{chain.name}</span>
              {(chain.id === 11155111 || chain.id === 84532) && (
                <Badge variant="secondary" className="ml-auto text-xs">Testnet</Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
'use client'

import { CHAINS } from '@/lib/constants'
import Image from 'next/image'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ChainSelectorProps {
  value: number
  onChange: (chainId: number) => void
}

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  const selectedChain = Object.values(CHAINS).find(c => c.id === value)

  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-[120px] h-12 border-0 bg-white hover:bg-gray-50">
        <SelectValue>
          <div className="flex items-center gap-2">
            <Image
              src={selectedChain?.logo || '/logos/ethereum-eth-logo.svg'}
              alt={selectedChain?.short || ''}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="font-semibold">{selectedChain?.short}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.values(CHAINS).map((chain) => (
          <SelectItem key={chain.id} value={chain.id.toString()}>
            <div className="flex items-center gap-2">
              <Image
                src={chain.logo}
                alt={chain.short}
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="font-semibold">{chain.short}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
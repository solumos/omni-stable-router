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
import { Badge } from '@/components/ui/badge'

interface ChainSelectorProps {
  value: number
  onChange: (chainId: number) => void
}

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  const selectedChain = Object.values(CHAINS).find(c => c.id === value)

  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-full">
        <SelectValue>
          <div className="flex items-center gap-2">
            <Image
              src={selectedChain?.logo || '/logos/ethereum-eth-logo.svg'}
              alt={selectedChain?.name || ''}
              width={20}
              height={20}
              className="rounded-full"
            />
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
              <Image
                src={chain.logo}
                alt={chain.name}
                width={16}
                height={16}
                className="rounded-full"
              />
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
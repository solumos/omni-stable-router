'use client'

import { TOKENS, type TokenSymbol } from '@/lib/constants'
import Image from 'next/image'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TokenSelectorProps {
  value: TokenSymbol
  onChange: (token: TokenSymbol) => void
  tokens: TokenSymbol[]
}

export function TokenSelector({ value, onChange, tokens }: TokenSelectorProps) {
  // Ensure value is valid
  const token = TOKENS[value]
  if (!token) {
    console.warn(`Token ${value} not found in TOKENS`)
    return null
  }

  return (
    <Select value={value} onValueChange={onChange as any}>
      <SelectTrigger className="w-[120px] h-12 border-0 bg-white hover:bg-gray-50">
        <SelectValue>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex-shrink-0">
              <Image
                src={token.logo || '/logos/usd-coin-usdc-logo.svg'}
                alt={token.name}
                width={20}
                height={20}
                className="rounded-full w-full h-full object-contain"
              />
            </div>
            <span className="font-semibold">{value}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tokens.map((tokenSymbol) => {
          const tokenData = TOKENS[tokenSymbol]
          if (!tokenData) return null
          
          return (
            <SelectItem key={tokenSymbol} value={tokenSymbol}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 flex-shrink-0">
                  <Image
                    src={tokenData.logo || '/logos/usd-coin-usdc-logo.svg'}
                    alt={tokenData.name}
                    width={20}
                    height={20}
                    className="rounded-full w-full h-full object-contain"
                  />
                </div>
                <span className="font-semibold">{tokenSymbol}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
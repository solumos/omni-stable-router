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
  return (
    <Select value={value} onValueChange={onChange as any}>
      <SelectTrigger className="w-[120px] h-12 border-0 bg-white hover:bg-gray-50">
        <SelectValue>
          <div className="flex items-center gap-2">
            <Image
              src={TOKENS[value].logo}
              alt={TOKENS[value].name}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="font-semibold">{value}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tokens.map((token) => (
          <SelectItem key={token} value={token}>
            <div className="flex items-center gap-2">
              <Image
                src={TOKENS[token].logo}
                alt={TOKENS[token].name}
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="font-semibold">{token}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
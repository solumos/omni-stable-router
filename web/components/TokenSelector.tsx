'use client'

import { TOKENS, type TokenSymbol } from '@/lib/constants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface TokenSelectorProps {
  value: TokenSymbol
  onChange: (token: TokenSymbol) => void
  tokens: TokenSymbol[]
}

export function TokenSelector({ value, onChange, tokens }: TokenSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange as any}>
      <SelectTrigger className="w-[140px] h-14">
        <SelectValue>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
              {value[0]}
            </div>
            <div className="text-left">
              <div className="font-semibold">{value}</div>
              <div className="text-xs text-muted-foreground">{TOKENS[value].name}</div>
            </div>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {tokens.map((token) => (
          <SelectItem key={token} value={token}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                {token[0]}
              </div>
              <div>
                <div className="font-semibold">{token}</div>
                <div className="text-xs text-muted-foreground">{TOKENS[token].name}</div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
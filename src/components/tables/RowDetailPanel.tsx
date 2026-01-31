import { X, Copy, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ColumnInfo } from '../../../shared/types'

interface RowDetailPanelProps {
  row: Record<string, unknown>
  columns: ColumnInfo[]
  onClose: () => void
}

export function RowDetailPanel({ row, columns, onClose }: RowDetailPanelProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Handle Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleCopy = async (columnName: string, value: unknown) => {
    const text = value === null ? 'NULL' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
    await navigator.clipboard.writeText(text)
    setCopiedField(columnName)
    setTimeout(() => setCopiedField(null), 1500)
  }

  const formatValue = (value: unknown): string => {
    if (value === null) return 'NULL'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  return (
    <div className="w-80 border-l border-white/10 bg-[#1a1a1a] flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Row Details</span>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground/50 mr-1">esc</span>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {columns.map((col) => {
          const value = row[col.name]
          const displayValue = formatValue(value)
          const isLong = displayValue.length > 100
          const isNull = value === null

          return (
            <div
              key={col.name}
              className="rounded bg-white/[0.03] p-2 group"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10px] text-muted-foreground font-medium"
                  title={col.type}
                >
                  {col.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopy(col.name, value)}
                >
                  {copiedField === col.name ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <div
                className={cn(
                  'text-xs font-mono break-all whitespace-pre-wrap',
                  isNull && 'text-muted-foreground/50 italic',
                  isLong && 'max-h-40 overflow-auto'
                )}
              >
                {displayValue}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

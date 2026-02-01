import { Plus, X } from 'lucide-react'
import { Button } from '../ui/button'
import type { ColumnInfo } from '@shared/types'

export interface Filter {
  id: string
  column: string
  operator: string
  value: string
}

interface FilterBarProps {
  columns: ColumnInfo[]
  filters: Filter[]
  onFiltersChange: (filters: Filter[]) => void
  onApply: () => void
  onClear: () => void
}

const OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'is_null', label: 'Is NULL' },
  { value: 'is_not_null', label: 'Is Not NULL' }
]

export function FilterBar({ columns, filters, onFiltersChange, onApply, onClear }: FilterBarProps) {
  const addFilter = () => {
    const newFilter: Filter = {
      id: crypto.randomUUID(),
      column: columns[0]?.name || '',
      operator: 'contains',
      value: ''
    }
    onFiltersChange([...filters, newFilter])
  }

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter((f) => f.id !== id))
  }

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onApply()
    }
  }

  if (filters.length === 0) {
    return (
      <div className="px-2 py-1.5 border-b border-white/10 flex items-center gap-2 bg-[#1a1a1a]">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] px-2 text-muted-foreground"
          onClick={addFilter}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Filter
        </Button>
      </div>
    )
  }

  return (
    <div className="border-b border-white/10 bg-[#1a1a1a]">
      {filters.map((filter, index) => (
        <div
          key={filter.id}
          className="px-2 py-1.5 flex items-center gap-2 border-b border-white/5 last:border-b-0"
        >
          {/* Column select */}
          <select
            value={filter.column}
            onChange={(e) => updateFilter(filter.id, { column: e.target.value })}
            className="h-6 px-2 text-[11px] bg-[#2a2a2a] border border-white/10 rounded text-foreground focus:outline-none focus:border-blue-500/50"
          >
            {columns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>

          {/* Operator select */}
          <select
            value={filter.operator}
            onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
            className="h-6 px-2 text-[11px] bg-[#2a2a2a] border border-white/10 rounded text-foreground focus:outline-none focus:border-blue-500/50"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>

          {/* Value input */}
          {!['is_null', 'is_not_null'].includes(filter.operator) && (
            <input
              type="text"
              value={filter.value}
              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Value..."
              className="flex-1 h-6 px-2 text-[11px] bg-[#2a2a2a] border border-white/10 rounded text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-blue-500/50 font-mono min-w-[100px]"
            />
          )}

          {/* Remove button */}
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 text-muted-foreground hover:text-foreground"
            onClick={() => removeFilter(filter.id)}
          >
            <X className="w-3 h-3" />
          </Button>

          {/* Add button on last row */}
          {index === filters.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-muted-foreground hover:text-foreground"
              onClick={addFilter}
            >
              <Plus className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}

      {/* Action buttons */}
      <div className="px-2 py-1.5 flex items-center justify-end gap-2">
        <span className="text-[9px] text-muted-foreground/50 mr-1">enter to apply</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] px-2"
          onClick={onClear}
        >
          Clear
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-6 text-[11px] px-3"
          onClick={onApply}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ColumnInfo } from '../../../shared/types'

interface AddRowModalProps {
  open: boolean
  onClose: () => void
  onAddRow: (data: Record<string, unknown>) => Promise<void>
  columns: ColumnInfo[]
}

export function AddRowModal({ open, onClose, onAddRow, columns }: AddRowModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if column has auto-generated default (functions, expressions, etc.)
  const hasAutoDefault = (col: ColumnInfo) => {
    const colType = col.type.toLowerCase()
    if (colType.includes('serial')) return true
    // Any default value with parentheses or :: is likely a function or type cast
    if (col.defaultValue?.includes('(') || col.defaultValue?.includes('::')) return true
    return false
  }

  // Reset form when modal opens - don't pre-populate defaults, let DB handle them
  useEffect(() => {
    if (open) {
      setValues({})
      setError(null)
    }
  }, [open])

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)

    try {
      // Convert string values to appropriate types
      const data: Record<string, unknown> = {}

      for (const col of columns) {
        const value = values[col.name]

        // Skip empty values for nullable columns or auto-increment types
        if (value === '' || value === undefined) {
          if (col.nullable || hasAutoDefault(col)) {
            continue
          }
          if (!col.defaultValue) {
            throw new Error(`${col.name} is required`)
          }
          continue
        }

        // Parse value based on column type
        const colType = col.type.toLowerCase()
        if (colType.includes('int') || colType === 'serial' || colType === 'bigserial') {
          data[col.name] = parseInt(value, 10)
          if (isNaN(data[col.name] as number)) {
            throw new Error(`${col.name} must be a valid integer`)
          }
        } else if (colType.includes('numeric') || colType.includes('decimal') || colType.includes('float') || colType.includes('double') || colType === 'real') {
          data[col.name] = parseFloat(value)
          if (isNaN(data[col.name] as number)) {
            throw new Error(`${col.name} must be a valid number`)
          }
        } else if (colType === 'boolean' || colType === 'bool') {
          const lower = value.toLowerCase()
          if (lower === 'true' || lower === '1' || lower === 'yes') {
            data[col.name] = true
          } else if (lower === 'false' || lower === '0' || lower === 'no') {
            data[col.name] = false
          } else {
            throw new Error(`${col.name} must be true or false`)
          }
        } else if (colType === 'jsonb' || colType === 'json') {
          try {
            data[col.name] = JSON.parse(value)
          } catch {
            throw new Error(`${col.name} must be valid JSON`)
          }
        } else {
          data[col.name] = value
        }
      }

      await onAddRow(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add row')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setValues({})
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader>
        <DialogTitle>Add Row</DialogTitle>
        <DialogClose onClose={handleClose} />
      </DialogHeader>

      <DialogContent className="space-y-3 max-h-[60vh] overflow-y-auto">
        {columns.map((col) => {
          const isAuto = hasAutoDefault(col)
          const isRequired = !col.nullable && !col.defaultValue && !isAuto

          return (
            <div key={col.name} className="space-y-1.5">
              <Label htmlFor={col.name} className="flex items-center gap-2">
                <span>{col.name}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {col.type}
                  {col.isPrimaryKey && ' (PK)'}
                  {isAuto && ' (auto)'}
                </span>
                {isRequired && <span className="text-red-400 text-xs">*</span>}
              </Label>
              <Input
                id={col.name}
                value={values[col.name] || ''}
                onChange={(e) => setValues({ ...values, [col.name]: e.target.value })}
                placeholder={isAuto ? 'Auto-generated' : col.nullable ? 'NULL' : ''}
                disabled={isAuto}
                className={cn(
                  'h-8 text-sm font-mono',
                  isAuto && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>
          )
        })}

        {error && (
          <div className="text-sm px-3 py-2 rounded-md bg-red-500/10 text-red-500">
            {error}
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Adding...' : 'Add Row'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

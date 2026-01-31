import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditStore } from '@/stores/editStore'
import { cn } from '@/lib/utils'

interface EditableCellProps {
  tabId: string
  rowIndex: number
  columnId: string
  value: unknown
  type: string
  isPrimaryKey: boolean
}

export function EditableCell({
  tabId,
  rowIndex,
  columnId,
  value,
  type,
  isPrimaryKey
}: EditableCellProps) {
  const editingCell = useEditStore((state) => state.editingCell)
  const setEditingCell = useEditStore((state) => state.setEditingCell)
  const clearEditingCell = useEditStore((state) => state.clearEditingCell)
  const addEdit = useEditStore((state) => state.addEdit)
  const getEdit = useEditStore((state) => state.getEdit)

  const cellKey = `${tabId}:${rowIndex}:${columnId}`
  const isEditing = editingCell === cellKey
  const pendingEdit = getEdit(tabId, rowIndex, columnId)

  const displayValue = pendingEdit !== undefined ? pendingEdit.newValue : value
  const isDirty = pendingEdit !== undefined

  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = useCallback(() => {
    if (isPrimaryKey) return // Can't edit primary key
    setEditingCell(tabId, rowIndex, columnId)
    setEditValue(formatForEdit(displayValue, type))
  }, [isPrimaryKey, tabId, rowIndex, columnId, displayValue, type, setEditingCell])

  const handleSave = useCallback(() => {
    const newValue = parseFromEdit(editValue, type)
    addEdit(tabId, {
      rowIndex,
      columnId,
      originalValue: value,
      newValue
    })
    clearEditingCell()
  }, [editValue, type, tabId, rowIndex, columnId, value, addEdit, clearEditingCell])

  const handleCancel = useCallback(() => {
    clearEditingCell()
  }, [clearEditingCell])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      } else if (e.key === 'Tab') {
        handleSave()
      }
    },
    [handleSave, handleCancel]
  )

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={getInputType(type)}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="w-full bg-[#2a2a2a] border border-blue-500/50 rounded px-1 py-0 text-xs font-mono focus:outline-none focus:border-blue-500"
      />
    )
  }

  return (
    <div
      className={cn(
        'cursor-pointer min-h-[20px] flex items-center truncate',
        isDirty && 'bg-yellow-500/20 rounded px-1 -mx-1',
        isPrimaryKey && 'cursor-not-allowed opacity-70'
      )}
      onDoubleClick={handleStartEdit}
      title={isPrimaryKey ? 'Primary key cannot be edited' : 'Double-click to edit'}
    >
      {formatForDisplay(displayValue, type)}
    </div>
  )
}

function formatForDisplay(value: unknown, type: string): React.ReactNode {
  if (value === null) {
    return <span className="text-muted-foreground/50 text-[10px]">NULL</span>
  }
  if (typeof value === 'object') {
    return <span className="text-orange-400/80">{JSON.stringify(value)}</span>
  }
  if (typeof value === 'boolean') {
    return <span className="text-purple-400">{value ? 'true' : 'false'}</span>
  }
  if (type.includes('timestamp') || type.includes('date')) {
    if (value instanceof Date) {
      return value.toISOString()
    }
  }
  return String(value)
}

function formatForEdit(value: unknown, type: string): string {
  if (value === null) return ''
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  if (type.includes('timestamp') || type.includes('date')) {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 16)
    }
  }
  return String(value)
}

function parseFromEdit(value: string, type: string): unknown {
  if (value === '') return null

  // Handle numeric types
  if (type.includes('int') || type === 'numeric' || type === 'decimal' || type === 'real' || type === 'double') {
    const num = Number(value)
    return isNaN(num) ? value : num
  }

  // Handle boolean
  if (type === 'boolean') {
    return value.toLowerCase() === 'true' || value === '1'
  }

  // Handle JSON
  if (type === 'json' || type === 'jsonb') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  return value
}

function getInputType(type: string): string {
  if (type.includes('int') || type === 'numeric' || type === 'decimal' || type === 'real' || type === 'double') {
    return 'number'
  }
  if (type.includes('timestamp') || type.includes('date')) {
    return 'datetime-local'
  }
  return 'text'
}

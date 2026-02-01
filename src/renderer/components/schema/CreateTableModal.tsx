import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Plus, Trash2, Key } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Column {
  id: string
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  defaultValue: string
}

interface CreateTableModalProps {
  open: boolean
  onClose: () => void
  onCreateTable: (tableName: string, schema: string, columns: Column[]) => Promise<void>
  schemas: string[]
  defaultSchema?: string
}

const COLUMN_TYPES = [
  'serial',
  'integer',
  'bigint',
  'text',
  'varchar(255)',
  'boolean',
  'timestamp',
  'date',
  'uuid',
  'jsonb',
]

export function CreateTableModal({ open, onClose, onCreateTable, schemas, defaultSchema }: CreateTableModalProps) {
  const [tableName, setTableName] = useState('')
  const [selectedSchema, setSelectedSchema] = useState(defaultSchema || schemas[0] || 'public')
  const [columns, setColumns] = useState<Column[]>([
    { id: crypto.randomUUID(), name: 'id', type: 'serial', nullable: false, primaryKey: true, defaultValue: '' }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addColumn = () => {
    setColumns([
      ...columns,
      { id: crypto.randomUUID(), name: '', type: 'text', nullable: true, primaryKey: false, defaultValue: '' }
    ])
  }

  const removeColumn = (id: string) => {
    if (columns.length > 1) {
      setColumns(columns.filter(c => c.id !== id))
    }
  }

  const updateColumn = (id: string, updates: Partial<Column>) => {
    setColumns(columns.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const togglePrimaryKey = (id: string) => {
    setColumns(columns.map(c => {
      if (c.id !== id) return c
      const newPk = !c.primaryKey
      return {
        ...c,
        primaryKey: newPk,
        nullable: newPk ? false : c.nullable // PK columns can't be nullable
      }
    }))
  }

  const handleSubmit = async () => {
    if (!tableName.trim()) {
      setError('Table name is required')
      return
    }

    if (columns.some(c => !c.name.trim())) {
      setError('All columns must have a name')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onCreateTable(tableName, selectedSchema, columns)
      // Reset form
      setTableName('')
      setSelectedSchema(defaultSchema || schemas[0] || 'public')
      setColumns([
        { id: crypto.randomUUID(), name: 'id', type: 'serial', nullable: false, primaryKey: true, defaultValue: '' }
      ])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setTableName('')
    setSelectedSchema(defaultSchema || schemas[0] || 'public')
    setColumns([
      { id: crypto.randomUUID(), name: 'id', type: 'serial', nullable: false, primaryKey: true, defaultValue: '' }
    ])
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogHeader>
        <DialogTitle>Create Table</DialogTitle>
        <DialogClose onClose={handleClose} />
      </DialogHeader>

      <DialogContent className="space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Schema & Table Name */}
        <div className="grid grid-cols-[120px_1fr] gap-3">
          <div className="space-y-2">
            <Label htmlFor="schema">Schema</Label>
            <select
              id="schema"
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md"
            >
              {schemas.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tableName">Table Name</Label>
            <Input
              id="tableName"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
            />
          </div>
        </div>

        {/* Columns */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Columns</Label>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addColumn}>
              <Plus className="w-3 h-3 mr-1" />
              Add Column
            </Button>
          </div>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_60px_40px_32px] gap-2 text-[10px] text-muted-foreground px-1">
              <span>Name</span>
              <span>Type</span>
              <span>Nullable</span>
              <span>PK</span>
              <span></span>
            </div>

            {/* Column rows */}
            {columns.map((column) => (
              <div
                key={column.id}
                className="grid grid-cols-[1fr_120px_60px_40px_32px] gap-2 items-center"
              >
                <Input
                  value={column.name}
                  onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                  placeholder="column_name"
                  className="h-8 text-xs"
                />
                <select
                  value={column.type}
                  onChange={(e) => updateColumn(column.id, { type: e.target.value })}
                  className="h-8 px-2 text-xs bg-background border border-border rounded-md"
                >
                  {COLUMN_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => !column.primaryKey && updateColumn(column.id, { nullable: !column.nullable })}
                  disabled={column.primaryKey}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
                    column.primaryKey && 'opacity-30 cursor-not-allowed',
                    column.nullable
                      ? 'bg-blue-500/20 text-blue-500'
                      : 'hover:bg-white/5 text-muted-foreground'
                  )}
                >
                  <span className="text-xs font-medium">{column.nullable ? 'Y' : 'N'}</span>
                </button>
                <button
                  onClick={() => togglePrimaryKey(column.id)}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
                    column.primaryKey
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'hover:bg-white/5 text-muted-foreground'
                  )}
                >
                  <Key className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeColumn(column.id)}
                  disabled={columns.length === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5 text-muted-foreground hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
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
          {saving ? 'Creating...' : 'Create Table'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

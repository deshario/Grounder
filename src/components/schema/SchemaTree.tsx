import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Table, Folder, RefreshCw, Search } from 'lucide-react'
import { useConnectionStore } from '@/stores/connectionStore'
import { ipc } from '@/lib/ipc'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SchemaInfo, TableInfo } from '../../../shared/types'

interface TreeNodeProps {
  label: string
  icon: React.ReactNode
  children?: React.ReactNode
  isExpanded?: boolean
  onToggle?: () => void
  onClick?: () => void
  level?: number
  badge?: string | number
}

function TreeNode({ label, icon, children, isExpanded, onToggle, onClick, level = 0, badge }: TreeNodeProps) {
  const hasChildren = !!children

  return (
    <div>
      <button
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-white/5 rounded-md',
          'text-left'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) onToggle?.()
          onClick?.()
        }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        {icon}
        <span className="truncate flex-1">{label}</span>
        {badge !== undefined && (
          <span className="text-xs text-muted">{badge}</span>
        )}
      </button>
      {hasChildren && isExpanded && (
        <div>{children}</div>
      )}
    </div>
  )
}

interface SchemaTreeProps {
  onTableSelect?: (table: string, schema: string) => void
}

export function SchemaTree({ onTableSelect }: SchemaTreeProps) {
  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)
  const connectionStatus = useConnectionStore((state) =>
    activeConnectionId ? state.connectionStatuses[activeConnectionId] : null
  )

  const [schemas, setSchemas] = useState<SchemaInfo[]>([])
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, TableInfo[]>>({})
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public']))
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadSchemas = async () => {
    if (!activeConnectionId || connectionStatus !== 'connected') return

    setLoading(true)
    try {
      const result = await ipc.getSchemas(activeConnectionId)
      if (result.success && result.data) {
        setSchemas(result.data)
        // Auto-load tables for public schema
        if (result.data.some((s) => s.name === 'public')) {
          await loadTables('public')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const loadTables = async (schema: string) => {
    if (!activeConnectionId) return

    const result = await ipc.getTables(activeConnectionId, schema)
    if (result.success && result.data) {
      setTablesBySchema((prev) => ({
        ...prev,
        [schema]: result.data!
      }))
    }
  }

  useEffect(() => {
    if (connectionStatus === 'connected') {
      loadSchemas()
    } else {
      setSchemas([])
      setTablesBySchema({})
    }
  }, [activeConnectionId, connectionStatus])

  const toggleSchema = async (schema: string) => {
    const newExpanded = new Set(expandedSchemas)
    if (newExpanded.has(schema)) {
      newExpanded.delete(schema)
    } else {
      newExpanded.add(schema)
      // Load tables if not already loaded
      if (!tablesBySchema[schema]) {
        await loadTables(schema)
      }
    }
    setExpandedSchemas(newExpanded)
  }

  const handleRefresh = () => {
    setTablesBySchema({})
    loadSchemas()
  }

  // Filter schemas and tables based on search
  const filteredSchemas = schemas.filter((schema) => {
    if (!searchQuery) return true
    const tables = tablesBySchema[schema.name] || []
    return (
      schema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tables.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  if (!activeConnectionId) {
    return (
      <div className="flex flex-col items-center py-8 px-4 text-center">
        <div className="w-10 h-10 mb-3 rounded-lg bg-white/5 flex items-center justify-center">
          <Folder className="w-5 h-5 opacity-40" />
        </div>
        <p className="text-xs text-muted-foreground">No connection selected</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Select a connection first</p>
      </div>
    )
  }

  if (connectionStatus !== 'connected') {
    return (
      <div className="flex flex-col items-center py-8 px-4 text-center">
        <div className="w-10 h-10 mb-3 rounded-lg bg-yellow-500/10 flex items-center justify-center">
          <Folder className="w-5 h-5 text-yellow-500/60" />
        </div>
        <p className="text-xs text-muted-foreground">Not connected</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Double-click connection to connect</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and refresh */}
      <div className="p-2 flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <Input
            placeholder="Filter tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 shrink-0"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Schema tree */}
      <div className="flex-1 overflow-auto p-1">
        {filteredSchemas.length === 0 ? (
          <div className="text-xs text-muted px-2 py-4 text-center">
            {loading ? 'Loading...' : 'No schemas found'}
          </div>
        ) : (
          filteredSchemas.map((schema) => {
            const tables = tablesBySchema[schema.name] || []
            const filteredTables = searchQuery
              ? tables.filter((t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
              : tables

            return (
              <TreeNode
                key={schema.name}
                label={schema.name}
                icon={<Folder className="w-4 h-4 text-yellow-500 shrink-0" />}
                isExpanded={expandedSchemas.has(schema.name)}
                onToggle={() => toggleSchema(schema.name)}
                badge={tables.length || undefined}
              >
                {filteredTables.map((table) => (
                  <TreeNode
                    key={`${schema.name}.${table.name}`}
                    label={table.name}
                    icon={<Table className="w-4 h-4 text-blue-500 shrink-0" />}
                    level={1}
                    badge={table.rowCount?.toLocaleString()}
                    onClick={() => onTableSelect?.(table.name, schema.name)}
                  />
                ))}
              </TreeNode>
            )
          })
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight, Save, X } from 'lucide-react'
import { ipc } from '@/lib/ipc'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEditStore } from '@/stores/editStore'
import { EditableCell } from './EditableCell'
import type { ColumnInfo, PaginationOptions } from '../../../shared/types'

interface TableViewProps {
  connectionId: string
  tableName: string
  schema: string
  tabId: string
}

const PAGE_SIZE = 100

export function TableView({ connectionId, tableName, schema, tabId }: TableViewProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [primaryKeys, setPrimaryKeys] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(0)

  const parentRef = useRef<HTMLDivElement>(null)

  const pendingEdits = useEditStore((state) => state.pendingEdits[tabId] || [])
  const clearEdits = useEditStore((state) => state.clearEdits)
  const hasEdits = pendingEdits.length > 0

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const options: PaginationOptions = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        orderBy: sorting[0]?.id,
        orderDirection: sorting[0]?.desc ? 'desc' : 'asc'
      }

      const [dataResult, pkResult] = await Promise.all([
        ipc.getTableData(connectionId, tableName, schema, options),
        ipc.getPrimaryKey(connectionId, tableName, schema)
      ])

      if (dataResult.success && dataResult.data) {
        setData(dataResult.data.rows)
        setColumns(dataResult.data.columns)
        setTotalCount(dataResult.data.totalCount)
      } else {
        setError(dataResult.error || 'Failed to load data')
      }

      if (pkResult.success && pkResult.data) {
        setPrimaryKeys(pkResult.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [connectionId, tableName, schema, page, sorting])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveChanges = async () => {
    if (pendingEdits.length === 0) return
    if (primaryKeys.length === 0) {
      setError('Cannot save: table has no primary key')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Group edits by row
      const editsByRow = pendingEdits.reduce(
        (acc, edit) => {
          if (!acc[edit.rowIndex]) {
            acc[edit.rowIndex] = []
          }
          acc[edit.rowIndex].push(edit)
          return acc
        },
        {} as Record<number, typeof pendingEdits>
      )

      // Save each row
      for (const [rowIndexStr, rowEdits] of Object.entries(editsByRow)) {
        const rowIndex = Number(rowIndexStr)
        const row = data[rowIndex]

        // Build primary key value
        const pk: Record<string, unknown> = {}
        for (const pkCol of primaryKeys) {
          pk[pkCol] = row[pkCol]
        }

        // Build data to update
        const updateData: Record<string, unknown> = {}
        for (const edit of rowEdits) {
          updateData[edit.columnId] = edit.newValue
        }

        const result = await ipc.updateRow(connectionId, tableName, schema, pk, updateData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to save changes')
        }
      }

      // Clear edits and reload data
      clearEdits(tabId)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardChanges = () => {
    clearEdits(tabId)
  }

  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return columns.map((col) => ({
      accessorKey: col.name,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 hover:text-foreground"
          onClick={() => column.toggleSorting()}
        >
          <span className="font-medium">{col.name}</span>
          <span className="text-[10px] text-muted-foreground">({col.type})</span>
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-3 h-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </button>
      ),
      cell: ({ getValue, row }) => {
        const value = getValue()
        const rowIndex = row.index
        return (
          <EditableCell
            tabId={tabId}
            rowIndex={rowIndex}
            columnId={col.name}
            value={value}
            type={col.type}
            isPrimaryKey={primaryKeys.includes(col.name)}
          />
        )
      }
    }))
  }, [columns, tabId, primaryKeys])

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true
  })

  const { rows } = table.getRowModel()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 10
  })

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400">
        <p className="text-sm">{error}</p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={loadData}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table header info */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {totalCount.toLocaleString()} rows total
          {loading && <Loader2 className="w-3 h-3 ml-2 inline animate-spin" />}
        </span>
        <div className="flex items-center gap-2">
          {hasEdits && (
            <>
              <span className="text-yellow-500">{pendingEdits.length} pending changes</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleDiscardChanges}
                disabled={saving}
              >
                <X className="w-3 h-3 mr-1" />
                Discard
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-6 text-xs"
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                Save
              </Button>
            </>
          )}
          <span className="text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left border-b border-border text-muted-foreground font-normal whitespace-nowrap"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {virtualizer.getVirtualItems().length === 0 && !loading ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                  No data found
                </td>
              </tr>
            ) : (
              <>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = rows[virtualRow.index]
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'hover:bg-white/5',
                        virtualRow.index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                      )}
                      style={{
                        height: `${virtualRow.size}px`
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-1.5 border-b border-border/50 max-w-[300px]"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-2 border-t border-border flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Page {page + 1} of {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

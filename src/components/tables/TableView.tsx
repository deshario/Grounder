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
import { ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight, Save, X, Plus, Trash2 } from 'lucide-react'
import { ipc } from '@/lib/ipc'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEditStore } from '@/stores/editStore'
import { useTabStore } from '@/stores/tabStore'
import { EditableCell } from './EditableCell'
import { RowDetailPanel } from './RowDetailPanel'
import { FilterBar, type Filter } from './FilterBar'
import { AddRowModal } from './AddRowModal'

const EMPTY_EDITS: never[] = []
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
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [filters, setFilters] = useState<Filter[]>([])
  const [appliedFilters, setAppliedFilters] = useState<Filter[]>([])
  const [showAddRow, setShowAddRow] = useState(false)

  const parentRef = useRef<HTMLDivElement>(null)

  const pendingEdits = useEditStore(
    (state) => state.pendingEdits[tabId] ?? EMPTY_EDITS
  )
  const clearEdits = useEditStore((state) => state.clearEdits)
  const hasEdits = pendingEdits.length > 0

  const closeRowDetailsSignal = useTabStore((state) => state.closeRowDetailsSignal)

  useEffect(() => {
    if (closeRowDetailsSignal > 0) {
      setSelectedRowIndex(null)
    }
  }, [closeRowDetailsSignal])

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

  const handleApplyFilters = () => {
    setAppliedFilters([...filters])
    setPage(0)
  }

  const handleClearFilters = () => {
    setFilters([])
    setAppliedFilters([])
    setPage(0)
  }

  const handleAddRow = async (data: Record<string, unknown>) => {
    const result = await ipc.insertRow(connectionId, tableName, schema, data)
    if (!result.success) {
      throw new Error(result.error || 'Failed to add row')
    }
    await loadData()
  }

  const handleDeleteRow = async () => {
    if (selectedRowIndex === null || primaryKeys.length === 0) return

    const row = data[selectedRowIndex]
    const pk: Record<string, unknown> = {}
    for (const pkCol of primaryKeys) {
      pk[pkCol] = row[pkCol]
    }

    const confirmed = window.confirm('Are you sure you want to delete this row? This cannot be undone.')
    if (!confirmed) return

    try {
      const result = await ipc.deleteRow(connectionId, tableName, schema, pk)
      if (!result.success) {
        setError(result.error || 'Failed to delete row')
        return
      }
      setSelectedRowIndex(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete row')
    }
  }

  // Apply client-side filtering
  const filteredData = useMemo(() => {
    if (appliedFilters.length === 0) return data

    return data.filter((row) => {
      return appliedFilters.every((filter) => {
        const value = row[filter.column]
        const filterValue = filter.value.toLowerCase()
        const strValue = value === null ? '' : String(value).toLowerCase()

        switch (filter.operator) {
          case 'contains':
            return strValue.includes(filterValue)
          case 'equals':
            return strValue === filterValue
          case 'not_equals':
            return strValue !== filterValue
          case 'starts_with':
            return strValue.startsWith(filterValue)
          case 'ends_with':
            return strValue.endsWith(filterValue)
          case 'gt':
            return Number(value) > Number(filter.value)
          case 'gte':
            return Number(value) >= Number(filter.value)
          case 'lt':
            return Number(value) < Number(filter.value)
          case 'lte':
            return Number(value) <= Number(filter.value)
          case 'is_null':
            return value === null
          case 'is_not_null':
            return value !== null
          default:
            return true
        }
      })
    })
  }, [data, appliedFilters])

  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return columns.map((col) => ({
      accessorKey: col.name,
      header: ({ column }) => (
        <button
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          onClick={() => column.toggleSorting()}
        >
          <span className="font-medium text-xs">{col.name}</span>
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-blue-400" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="w-3 h-3 text-blue-400" />
          ) : null}
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
    data: filteredData,
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
    estimateSize: () => 26,
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

  const selectedRow = selectedRowIndex !== null ? data[selectedRowIndex] : null

  return (
    <div className="flex h-full min-w-0 overflow-hidden">
      {/* Main table area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Edit actions bar - only show when there are edits */}
        {hasEdits && (
          <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-end gap-2 text-[11px] bg-[#1a1a1a]">
            <span className="text-yellow-500">{pendingEdits.length} pending changes</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[11px] px-2"
              onClick={handleDiscardChanges}
              disabled={saving}
            >
              <X className="w-3 h-3 mr-1" />
              Discard
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-5 text-[11px] px-2"
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
          </div>
        )}

        {/* Filter Bar */}
        <FilterBar
          columns={columns}
          filters={filters}
          onFiltersChange={setFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

        {/* Table */}
      <div ref={parentRef} className="flex-1 min-w-0 overflow-auto">
        <table className="w-full border-collapse text-xs font-mono" style={{ minWidth: 'max-content' }}>
          <thead className="sticky top-0 bg-[#1a1a1a] z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-1.5 text-left border-b border-white/10 text-muted-foreground font-medium whitespace-nowrap"
                    style={{ minWidth: 100 }}
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
                  const isSelected = selectedRowIndex === virtualRow.index
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowIndex(isSelected ? null : virtualRow.index)}
                      className={cn(
                        'hover:bg-white/[0.06] cursor-pointer',
                        virtualRow.index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]',
                        isSelected && 'bg-blue-500/20 hover:bg-blue-500/25'
                      )}
                      style={{
                        height: `${virtualRow.size}px`
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-1 border-b border-white/[0.06] whitespace-nowrap overflow-hidden text-ellipsis max-w-[400px]"
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
        <div className="px-3 py-1.5 border-t border-white/10 flex items-center justify-between bg-[#1a1a1a]">
          <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-[11px] px-2"
              onClick={() => setShowAddRow(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Row
            </Button>
            {selectedRowIndex !== null && primaryKeys.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[11px] px-2 text-red-400 hover:text-red-300"
                onClick={handleDeleteRow}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Row
              </Button>
            )}
            <span className="text-white/30">|</span>
            <span>
              {appliedFilters.length > 0
                ? `${filteredData.length.toLocaleString()} of ${totalCount.toLocaleString()} rows`
                : `${totalCount.toLocaleString()} rows`}
            </span>
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            <span className="text-white/30">|</span>
            <span>Page {page + 1} of {totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Row Detail Panel */}
      {selectedRow && (
        <RowDetailPanel
          row={selectedRow}
          columns={columns}
          onClose={() => setSelectedRowIndex(null)}
        />
      )}

      {/* Add Row Modal */}
      <AddRowModal
        open={showAddRow}
        onClose={() => setShowAddRow(false)}
        onAddRow={handleAddRow}
        columns={columns}
      />
    </div>
  )
}

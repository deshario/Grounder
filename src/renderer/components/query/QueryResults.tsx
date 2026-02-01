import { useMemo, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Download } from 'lucide-react'
import type { QueryResult } from '@shared/types'

interface QueryResultsProps {
  result: QueryResult
}

export function QueryResults({ result }: QueryResultsProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const exportToCsv = () => {
    if (result.rows.length === 0) return

    const headers = result.columns.join(',')
    const rows = result.rows.map((row) =>
      result.columns
        .map((col) => {
          const value = row[col]
          if (value === null) return ''
          const str = String(value)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        })
        .join(',')
    )

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-result-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return result.columns.map((col) => ({
      accessorKey: col,
      header: () => <span className="font-medium text-xs">{col}</span>,
      cell: ({ getValue }) => {
        const value = getValue()
        if (value === null) {
          return <span className="text-muted-foreground italic">NULL</span>
        }
        if (typeof value === 'object') {
          return <span className="text-blue-400">{JSON.stringify(value)}</span>
        }
        return String(value)
      }
    }))
  }, [result.columns])

  const table = useReactTable({
    data: result.rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  const { rows } = table.getRowModel()

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 10
  })

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="h-7 flex items-center gap-3 px-3 bg-[#1a1a1a] border-b border-border text-[11px] text-muted-foreground">
        <span>{result.rowCount} row{result.rowCount !== 1 ? 's' : ''}</span>
        <span>{result.executionTime}ms</span>
        <div className="flex-1" />
        {result.rows.length > 0 && (
          <button
            onClick={exportToCsv}
            className="flex items-center gap-1 px-2 py-0.5 text-white/60 hover:text-white/90 hover:bg-white/5 rounded"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        )}
      </div>

      {/* Table */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs font-mono" style={{ minWidth: 'max-content' }}>
          <thead className="sticky top-0 bg-[#1a1a1a] z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-1.5 text-left border-b border-white/10 text-muted-foreground whitespace-nowrap"
                    style={{ minWidth: 80 }}
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
            {virtualizer.getVirtualItems().length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                  No results
                </td>
              </tr>
            ) : (
              virtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index]
                return (
                  <tr
                    key={row.id}
                    className={
                      virtualRow.index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                    }
                    style={{ height: `${virtualRow.size}px` }}
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
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

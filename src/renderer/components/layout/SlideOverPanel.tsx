import { useEffect } from 'react'
import { X, Database, FolderTree, Plus } from 'lucide-react'
import { ConnectionList } from '../connections/ConnectionList'
import { ConnectionForm } from '../connections/ConnectionForm'
import { SchemaTree } from '../schema/SchemaTree'
import { useConnectionStore } from '../../stores/connectionStore'
import { cn } from '../../lib/utils'
import { useState } from 'react'

type PanelTab = 'connections' | 'schema'

interface SlideOverPanelProps {
  open: boolean
  onClose: () => void
  onTableSelect?: (table: string, schema: string) => void
  initialTab?: PanelTab
}

export function SlideOverPanel({ open, onClose, onTableSelect, initialTab = 'connections' }: SlideOverPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>(initialTab)
  const [showConnectionForm, setShowConnectionForm] = useState(false)

  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)
  const connectionStatus = useConnectionStore((state) =>
    activeConnectionId ? state.connectionStatuses[activeConnectionId] : null
  )
  const isConnected = connectionStatus === 'connected'

  // Sync with initialTab when panel opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  useEffect(() => {
    if (isConnected) {
      setActiveTab('schema')
    }
  }, [isConnected])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  const handleTableSelect = (table: string, schema: string) => {
    onTableSelect?.(table, schema)
    onClose()
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-80 bg-[#0f0f0f] border-r border-white/10 z-50',
          'transform transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <header className="h-14 flex items-center justify-center px-4 border-b border-white/10 shrink-0 relative">
          <span className="text-sm font-semibold">Grounder</span>
          <button
            onClick={onClose}
            className="absolute right-3 p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <nav className="flex border-b border-white/10 shrink-0">
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors',
              activeTab === 'connections'
                ? 'text-foreground border-b-2 border-primary bg-white/5'
                : 'text-muted hover:text-foreground'
            )}
            onClick={() => setActiveTab('connections')}
          >
            <Database className="w-4 h-4" />
            Connections
          </button>
          <button
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors',
              activeTab === 'schema'
                ? 'text-foreground border-b-2 border-primary bg-white/5'
                : 'text-muted hover:text-foreground',
              !isConnected && 'opacity-40 cursor-not-allowed'
            )}
            onClick={() => isConnected && setActiveTab('schema')}
            disabled={!isConnected}
          >
            <FolderTree className="w-4 h-4" />
            Schema
          </button>
        </nav>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'connections' ? (
            <div className="h-full overflow-auto p-3">
              <ConnectionList />
            </div>
          ) : (
            <SchemaTree onTableSelect={handleTableSelect} />
          )}
        </div>
        {activeTab === 'connections' && (
          <footer className="p-3 border-t border-white/10 shrink-0">
            <button
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
              onClick={() => setShowConnectionForm(true)}
            >
              <Plus className="w-4 h-4" />
              Add Connection
            </button>
          </footer>
        )}
      </aside>
      <ConnectionForm
        open={showConnectionForm}
        onClose={() => setShowConnectionForm(false)}
      />
    </>
  )
}

import { useState, useEffect } from 'react'
import { Plus, Database, FolderTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectionList } from '@/components/connections/ConnectionList'
import { ConnectionForm } from '@/components/connections/ConnectionForm'
import { SchemaTree } from '@/components/schema/SchemaTree'
import { useConnectionStore } from '@/stores/connectionStore'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
  onTableSelect?: (table: string, schema: string) => void
}

type SidebarTab = 'connections' | 'schema'

export function Sidebar({ className, onTableSelect }: SidebarProps) {
  const [showConnectionForm, setShowConnectionForm] = useState(false)
  const [activeTab, setActiveTab] = useState<SidebarTab>('connections')

  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)
  const connectionStatus = useConnectionStore((state) =>
    activeConnectionId ? state.connectionStatuses[activeConnectionId] : null
  )
  const isConnected = connectionStatus === 'connected'

  // Auto-switch to Schema tab when connected
  useEffect(() => {
    if (isConnected) {
      setActiveTab('schema')
    }
  }, [isConnected])

  return (
    <div className={cn('flex flex-col h-full bg-background border-r border-border', className)}>
      {/* Header with drag region for macOS */}
      <div className="h-12 flex items-center justify-end px-4 border-b border-border app-drag-region">
        <span className="text-sm font-medium">QueryPad</span>
      </div>

      {/* Tab buttons */}
      <div className="flex border-b border-border">
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs',
            activeTab === 'connections'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted hover:text-foreground'
          )}
          onClick={() => setActiveTab('connections')}
        >
          <Database className="w-3.5 h-3.5" />
          Connections
        </button>
        <button
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs',
            activeTab === 'schema'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted hover:text-foreground',
            !isConnected && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => isConnected && setActiveTab('schema')}
          disabled={!isConnected}
        >
          <FolderTree className="w-3.5 h-3.5" />
          Schema
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'connections' ? (
          <div className="h-full overflow-auto p-2">
            <ConnectionList />
          </div>
        ) : (
          <SchemaTree onTableSelect={onTableSelect} />
        )}
      </div>

      {/* Footer actions */}
      {activeTab === 'connections' && (
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setShowConnectionForm(true)}
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </Button>
        </div>
      )}

      {/* Connection Form Modal */}
      <ConnectionForm
        open={showConnectionForm}
        onClose={() => setShowConnectionForm(false)}
      />
    </div>
  )
}

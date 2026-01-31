import { useState, useEffect } from 'react'
import { Plus, Database, FolderTree } from 'lucide-react'
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
  const [isHovered, setIsHovered] = useState(false)

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
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex h-full bg-background border-r border-border',
        'transition-all duration-200 ease-out overflow-hidden',
        isHovered ? 'w-[280px]' : 'w-12',
        className
      )}
    >
      <nav className="w-12 shrink-0 flex flex-col border-r border-border">
        <div className="h-12 shrink-0 app-drag-region" />
        <button
          className={cn(
            'flex items-center justify-center h-10 transition-colors',
            activeTab === 'connections'
              ? 'text-foreground bg-white/5'
              : 'text-muted hover:text-foreground hover:bg-white/5'
          )}
          onClick={() => setActiveTab('connections')}
          title="Connections"
        >
          <Database className="w-5 h-5" />
        </button>
        <button
          className={cn(
            'flex items-center justify-center h-10 transition-colors',
            activeTab === 'schema'
              ? 'text-foreground bg-white/5'
              : 'text-muted hover:text-foreground hover:bg-white/5',
            !isConnected && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => isConnected && setActiveTab('schema')}
          disabled={!isConnected}
          title="Schema"
        >
          <FolderTree className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <button
          className="flex items-center justify-center h-10 text-muted hover:text-foreground hover:bg-white/5 transition-colors"
          onClick={() => setShowConnectionForm(true)}
          title="Add Connection"
        >
          <Plus className="w-5 h-5" />
        </button>
      </nav>
      {isHovered && (
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center px-3 border-b border-border shrink-0">
            <span className="text-sm font-medium">
              {activeTab === 'connections' ? 'Connections' : 'Schema'}
            </span>
          </header>
          <div className="flex-1 overflow-hidden">
            {activeTab === 'connections' ? (
              <div className="h-full overflow-auto p-2">
                <ConnectionList />
              </div>
            ) : (
              <SchemaTree onTableSelect={onTableSelect} />
            )}
          </div>
        </div>
      )}
      <ConnectionForm
        open={showConnectionForm}
        onClose={() => setShowConnectionForm(false)}
      />
    </aside>
  )
}

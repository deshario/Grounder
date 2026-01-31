import { useState } from 'react'
import { Menu, ChevronRight, FileCode } from 'lucide-react'
import { SlideOverPanel } from '@/components/layout/SlideOverPanel'
import { TabsContainer } from '@/components/layout/TabsContainer'
import { useTabStore } from '@/stores/tabStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { cn } from '@/lib/utils'

type PanelTab = 'connections' | 'schema'

function App() {
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<PanelTab>('connections')

  const openTableTab = useTabStore((state) => state.openTableTab)
  const openQueryTab = useTabStore((state) => state.openQueryTab)
  const activeTableTabId = useTabStore((state) => state.activeTableTabId)
  const tabs = useTabStore((state) => state.tabs)

  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)
  const connections = useConnectionStore((state) => state.connections)
  const connectionStatus = useConnectionStore((state) =>
    activeConnectionId ? state.connectionStatuses[activeConnectionId] : null
  )
  const isConnected = connectionStatus === 'connected'

  const activeConnection = connections.find((c) => c.id === activeConnectionId)
  const activeTableTab = tabs.find((t) => t.id === activeTableTabId && t.type === 'table')

  const handleTableSelect = (tableName: string, schema: string) => {
    if (activeConnectionId) {
      openTableTab(activeConnectionId, tableName, schema)
    }
  }

  const handleNewQuery = () => {
    if (activeConnectionId) {
      openQueryTab(activeConnectionId)
    }
  }

  const openPanel = (tab: PanelTab) => {
    setPanelTab(tab)
    setPanelOpen(true)
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-background">
      <div className="h-12 flex items-center gap-2 px-3 border-b border-border app-drag-region shrink-0">
        <div className="w-16 shrink-0" />
        <button
          onClick={() => openPanel('connections')}
          className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors no-drag"
        >
          <Menu className="w-4 h-4" />
        </button>
        <nav className="flex items-center gap-1 text-sm no-drag">
          {activeConnection ? (
            <>
              <button
                onClick={() => openPanel('connections')}
                className="text-muted hover:text-foreground transition-colors"
              >
                {activeConnection.name}
              </button>
              {activeTableTab && activeTableTab.type === 'table' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  <button
                    onClick={() => openPanel('schema')}
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    {activeTableTab.schema}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  <span className="text-foreground font-medium">{activeTableTab.tableName}</span>
                </>
              )}
            </>
          ) : (
            <button
              onClick={() => openPanel('connections')}
              className="text-muted hover:text-foreground transition-colors"
            >
              No connection
            </button>
          )}
        </nav>
        <div className="flex-1" />
        {isConnected && (
          <button
            onClick={handleNewQuery}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium no-drag',
              'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
            )}
          >
            <FileCode className="w-3.5 h-3.5" />
            New Query
          </button>
        )}
      </div>
      <TabsContainer className="flex-1 min-h-0" />
      <SlideOverPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onTableSelect={handleTableSelect}
        initialTab={panelTab}
      />
    </div>
  )
}

export default App

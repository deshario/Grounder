import { X, Plus, Table, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTabStore } from '@/stores/tabStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { TableView } from '@/components/tables/TableView'

interface TabsContainerProps {
  className?: string
}

export function TabsContainer({ className }: TabsContainerProps) {
  const tabs = useTabStore((state) => state.tabs)
  const activeTabId = useTabStore((state) => state.activeTabId)
  const closeTab = useTabStore((state) => state.closeTab)
  const setActiveTab = useTabStore((state) => state.setActiveTab)
  const openQueryTab = useTabStore((state) => state.openQueryTab)

  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  const handleNewQueryTab = () => {
    if (activeConnectionId) {
      openQueryTab(activeConnectionId)
    }
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Tab bar */}
      <div className="h-12 flex items-center border-b border-border app-drag-region">
        <div className="flex items-center gap-1 px-2 h-full no-drag overflow-x-auto">
          {tabs.length === 0 ? (
            <span className="text-xs text-muted px-2">No tabs open</span>
          ) : (
            tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer shrink-0',
                  activeTabId === tab.id
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted hover:text-foreground hover:bg-white/5'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.type === 'table' ? (
                  <Table className="w-3.5 h-3.5" />
                ) : (
                  <Code className="w-3.5 h-3.5" />
                )}
                <span className="max-w-[150px] truncate">{tab.title}</span>
                <button
                  className="hover:bg-white/10 rounded p-0.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="ml-auto px-2 no-drag">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={handleNewQueryTab}
            disabled={!activeConnectionId}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {!activeTab ? (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Table className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Select a table or run a query to get started</p>
          </div>
        ) : activeTab.type === 'table' ? (
          <TableView
            key={activeTab.id}
            tabId={activeTab.id}
            connectionId={activeTab.connectionId}
            tableName={activeTab.tableName}
            schema={activeTab.schema}
          />
        ) : (
          <div className="p-4 text-muted text-sm">
            Query editor coming soon...
          </div>
        )}
      </div>
    </div>
  )
}

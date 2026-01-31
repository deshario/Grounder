import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Table, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTabStore, type Tab } from '@/stores/tabStore'
import { TableView } from '@/components/tables/TableView'
import { QueryEditor } from '@/components/query/QueryEditor'

interface ContextMenu {
  x: number
  y: number
  tabId: string
}

interface TabsContainerProps {
  className?: string
}

export function TabsContainer({ className }: TabsContainerProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const tabs = useTabStore((state) => state.tabs)
  const activeTableTabId = useTabStore((state) => state.activeTableTabId)
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId)
  const closeTab = useTabStore((state) => state.closeTab)
  const closeOtherTabs = useTabStore((state) => state.closeOtherTabs)
  const closeTabsToRight = useTabStore((state) => state.closeTabsToRight)
  const setActiveTableTab = useTabStore((state) => state.setActiveTableTab)
  const setActiveQueryTab = useTabStore((state) => state.setActiveQueryTab)

  const tableTabs = useMemo(() => tabs.filter((t) => t.type === 'table'), [tabs])
  const queryTabs = useMemo(() => tabs.filter((t) => t.type === 'query'), [tabs])

  const activeTableTab = tableTabs.find((t) => t.id === activeTableTabId)
  const activeQueryTab = queryTabs.find((t) => t.id === activeQueryTabId)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, tabId })
  }

  const handleMenuAction = (action: 'close' | 'closeOthers' | 'closeRight') => {
    if (!contextMenu) return
    switch (action) {
      case 'close':
        closeTab(contextMenu.tabId)
        break
      case 'closeOthers':
        closeOtherTabs(contextMenu.tabId)
        break
      case 'closeRight':
        closeTabsToRight(contextMenu.tabId)
        break
    }
    setContextMenu(null)
  }

  const contextTabIndex = contextMenu ? tabs.findIndex((t) => t.id === contextMenu.tabId) : -1
  const hasTabsToRight = contextTabIndex !== -1 && contextTabIndex < tabs.length - 1
  const hasOtherTabs = tabs.length > 1

  const renderTabBar = (
    tabList: Tab[],
    activeId: string | null,
    setActive: (id: string | null) => void
  ) => (
    <div className="h-9 flex items-center gap-1 px-2 border-b border-border bg-[#0a0a0a] shrink-0 overflow-x-auto">
      {tabList.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'group flex items-center gap-2 px-3 py-1.5 rounded-md text-xs cursor-pointer shrink-0 transition-colors',
            activeId === tab.id
              ? 'bg-white/10 text-foreground'
              : 'text-muted hover:text-foreground hover:bg-white/5'
          )}
          onClick={() => setActive(tab.id)}
          onContextMenu={(e) => handleContextMenu(e, tab.id)}
        >
          {tab.type === 'query' ? <Code className="w-3 h-3" /> : <Table className="w-3 h-3" />}
          <span className="max-w-[120px] truncate">{tab.title}</span>
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
      ))}
    </div>
  )

  const hasTableTabs = tableTabs.length > 0
  const hasQueryTabs = queryTabs.length > 0

  return (
    <div className={cn('flex h-full bg-background', className)}>
      {(hasTableTabs || !hasQueryTabs) && (
        <div className={cn('flex flex-col min-w-0', hasQueryTabs ? 'flex-1 border-r border-border' : 'flex-1')}>
          {hasTableTabs && renderTabBar(tableTabs, activeTableTabId, setActiveTableTab)}
          <div className="flex-1 overflow-hidden min-w-0">
            {!activeTableTab ? (
              <div className="flex flex-col items-center justify-center h-full text-muted">
                <div className="w-16 h-16 mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                  <Table className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-sm font-medium mb-1">No table selected</p>
                <p className="text-xs text-muted-foreground">Click the menu to browse tables</p>
              </div>
            ) : (
              <TableView
                key={activeTableTab.id}
                tabId={activeTableTab.id}
                connectionId={activeTableTab.connectionId}
                tableName={activeTableTab.tableName}
                schema={activeTableTab.schema}
              />
            )}
          </div>
        </div>
      )}

      {hasQueryTabs && (
        <div className={cn('flex flex-col min-w-0', hasTableTabs ? 'flex-1' : 'flex-1')}>
          {renderTabBar(queryTabs, activeQueryTabId, setActiveQueryTab)}
          <div className="flex-1 overflow-hidden min-w-0">
            {activeQueryTab && (
              <QueryEditor
                key={activeQueryTab.id}
                tabId={activeQueryTab.id}
                connectionId={activeQueryTab.connectionId}
              />
            )}
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-40 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-1 text-[11px]"
          style={{ top: contextMenu.y + 8, left: contextMenu.x }}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-foreground hover:bg-white/10 transition-colors"
            onClick={() => handleMenuAction('close')}
          >
            Close
          </button>
          <button
            className={cn(
              'w-full px-3 py-1.5 text-left transition-colors',
              hasOtherTabs ? 'text-foreground hover:bg-white/10' : 'text-muted cursor-not-allowed'
            )}
            onClick={() => hasOtherTabs && handleMenuAction('closeOthers')}
            disabled={!hasOtherTabs}
          >
            Close Others
          </button>
          <button
            className={cn(
              'w-full px-3 py-1.5 text-left transition-colors',
              hasTabsToRight ? 'text-foreground hover:bg-white/10' : 'text-muted cursor-not-allowed'
            )}
            onClick={() => hasTabsToRight && handleMenuAction('closeRight')}
            disabled={!hasTabsToRight}
          >
            Close Tabs to the Right
          </button>
        </div>
      )}
    </div>
  )
}

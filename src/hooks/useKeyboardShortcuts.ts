import { useEffect } from 'react'
import { useTabStore } from '@/stores/tabStore'
import { useConnectionStore } from '@/stores/connectionStore'

export function useKeyboardShortcuts() {
  const openQueryTab = useTabStore((state) => state.openQueryTab)
  const closeTab = useTabStore((state) => state.closeTab)
  const tabs = useTabStore((state) => state.tabs)
  const activeTableTabId = useTabStore((state) => state.activeTableTabId)
  const activeQueryTabId = useTabStore((state) => state.activeQueryTabId)
  const setActiveTableTab = useTabStore((state) => state.setActiveTableTab)
  const setActiveQueryTab = useTabStore((state) => state.setActiveQueryTab)

  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)
  const connectionStatus = useConnectionStore((state) =>
    activeConnectionId ? state.connectionStatuses[activeConnectionId] : null
  )
  const isConnected = connectionStatus === 'connected'

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Cmd+N: New query tab
      if (isMod && e.key === 'n' && isConnected && activeConnectionId) {
        e.preventDefault()
        openQueryTab(activeConnectionId)
        return
      }

      // Cmd+W: Close active tab
      if (isMod && e.key === 'w') {
        e.preventDefault()
        // Prioritize query tab if focused, otherwise table tab
        if (activeQueryTabId) {
          closeTab(activeQueryTabId)
        } else if (activeTableTabId) {
          closeTab(activeTableTabId)
        }
        return
      }

      // Cmd+1-9: Switch to tab by index
      if (isMod && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        const tableTabs = tabs.filter((t) => t.type === 'table')
        const queryTabs = tabs.filter((t) => t.type === 'query')

        // First try table tabs, then query tabs
        if (index < tableTabs.length) {
          setActiveTableTab(tableTabs[index].id)
        } else {
          const queryIndex = index - tableTabs.length
          if (queryIndex < queryTabs.length) {
            setActiveQueryTab(queryTabs[queryIndex].id)
          }
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isConnected,
    activeConnectionId,
    activeTableTabId,
    activeQueryTabId,
    tabs,
    openQueryTab,
    closeTab,
    setActiveTableTab,
    setActiveQueryTab
  ])
}

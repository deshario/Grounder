import { Sidebar } from '@/components/layout/Sidebar'
import { TabsContainer } from '@/components/layout/TabsContainer'
import { useTabStore } from '@/stores/tabStore'
import { useConnectionStore } from '@/stores/connectionStore'

function App() {
  const openTableTab = useTabStore((state) => state.openTableTab)
  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId)

  const handleTableSelect = (tableName: string, schema: string) => {
    if (activeConnectionId) {
      openTableTab(activeConnectionId, tableName, schema)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="w-64 shrink-0" onTableSelect={handleTableSelect} />
      <TabsContainer className="flex-1 min-w-0" />
    </div>
  )
}

export default App

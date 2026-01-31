import { Sidebar } from '@/components/layout/Sidebar'
import { TabsContainer } from '@/components/layout/TabsContainer'
import { StatusBar } from '@/components/layout/StatusBar'
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
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="w-64 shrink-0" onTableSelect={handleTableSelect} />
        <TabsContainer className="flex-1 min-w-0" />
      </div>
      <StatusBar />
    </div>
  )
}

export default App

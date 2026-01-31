import { Sidebar } from '@/components/layout/Sidebar'
import { TabsContainer } from '@/components/layout/TabsContainer'
import { StatusBar } from '@/components/layout/StatusBar'

function App() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="w-64 shrink-0" />
        <TabsContainer className="flex-1" />
      </div>
      <StatusBar />
    </div>
  )
}

export default App

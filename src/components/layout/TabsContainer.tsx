import { X, Plus, Table, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  title: string
  type: 'table' | 'query'
}

interface TabsContainerProps {
  className?: string
}

export function TabsContainer({ className }: TabsContainerProps) {
  // Placeholder tabs for demo
  const tabs: Tab[] = []
  const activeTab: string | null = null

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Tab bar */}
      <div className="h-12 flex items-center border-b border-border app-drag-region">
        <div className="flex items-center gap-1 px-2 h-full no-drag">
          {tabs.length === 0 ? (
            <span className="text-xs text-muted px-2">No tabs open</span>
          ) : (
            tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer',
                  activeTab === tab.id
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted hover:text-foreground hover:bg-white/5'
                )}
              >
                {tab.type === 'table' ? (
                  <Table className="w-3.5 h-3.5" />
                ) : (
                  <Code className="w-3.5 h-3.5" />
                )}
                <span>{tab.title}</span>
                <button className="hover:bg-white/10 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="ml-auto px-2 no-drag">
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Table className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Select a table or run a query to get started</p>
          </div>
        ) : (
          <div className="p-4">
            {/* Tab content will be rendered here */}
          </div>
        )}
      </div>
    </div>
  )
}

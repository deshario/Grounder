import { useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectionList } from '@/components/connections/ConnectionList'
import { ConnectionForm } from '@/components/connections/ConnectionForm'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [showConnectionForm, setShowConnectionForm] = useState(false)

  return (
    <div className={cn('flex flex-col h-full bg-background border-r border-border', className)}>
      {/* Header with drag region for macOS */}
      <div className="h-12 flex items-center px-4 border-b border-border app-drag-region">
        <span className="text-sm font-medium pl-16">Connections</span>
      </div>

      {/* Connection list */}
      <div className="flex-1 overflow-auto p-2">
        <ConnectionList />
      </div>

      {/* Footer actions */}
      <div className="p-2 border-t border-border flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start gap-2"
          onClick={() => setShowConnectionForm(true)}
        >
          <Plus className="w-4 h-4" />
          Add Connection
        </Button>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Connection Form Modal */}
      <ConnectionForm
        open={showConnectionForm}
        onClose={() => setShowConnectionForm(false)}
      />
    </div>
  )
}

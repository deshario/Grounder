import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="p-8 pt-12">
      <h1 className="text-xl font-semibold mb-2">QueryPad</h1>
      <p className="text-muted mb-4">Database viewer/editor</p>
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>
  )
}

export default App

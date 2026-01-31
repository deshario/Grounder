import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ipc } from '@/lib/ipc'
import type { AppInfo } from '../shared/types'

function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [pingResult, setPingResult] = useState<string>('')

  useEffect(() => {
    ipc.getAppInfo().then(setAppInfo)
  }, [])

  const handlePing = async () => {
    const result = await ipc.ping()
    setPingResult(result)
  }

  return (
    <div className="p-8 pt-12">
      <h1 className="text-xl font-semibold mb-2">QueryPad</h1>
      <p className="text-muted mb-4">
        {appInfo ? `v${appInfo.version} on ${appInfo.platform}` : 'Loading...'}
      </p>
      <div className="flex gap-2 items-center">
        <Button onClick={handlePing}>Ping Main Process</Button>
        {pingResult && <span className="text-sm text-muted">Response: {pingResult}</span>}
      </div>
    </div>
  )
}

export default App

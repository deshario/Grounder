import { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useConnectionStore, type Connection } from '../../stores/connectionStore'
import { ipc } from '../../lib/ipc'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ConnectionFormProps {
  open: boolean
  onClose: () => void
  connection?: Connection
}

type InputMode = 'url' | 'manual'

function parseConnectionUrl(url: string): {
  host: string
  port: number
  database: string
  username: string
  password: string
} | null {
  try {
    // Handle postgres:// and postgresql:// URLs
    const urlObj = new URL(url.replace(/^postgresql:/, 'postgres:'))
    if (urlObj.protocol !== 'postgres:') return null

    return {
      host: urlObj.hostname || 'localhost',
      port: parseInt(urlObj.port) || 5432,
      database: urlObj.pathname.slice(1) || 'postgres',
      username: urlObj.username || 'postgres',
      password: decodeURIComponent(urlObj.password || '')
    }
  } catch {
    return null
  }
}

export function ConnectionForm({ open, onClose, connection }: ConnectionFormProps) {
  const addConnection = useConnectionStore((state) => state.addConnection)
  const updateConnection = useConnectionStore((state) => state.updateConnection)
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus)
  const setActiveConnection = useConnectionStore((state) => state.setActiveConnection)

  const [inputMode, setInputMode] = useState<InputMode>(connection ? 'manual' : 'url')
  const [urlInput, setUrlInput] = useState('')
  const [connectionName, setConnectionName] = useState(connection?.name || '')
  const [formData, setFormData] = useState({
    host: connection?.host || '',
    port: connection?.port || 5432,
    database: connection?.database || '',
    username: connection?.username || '',
    password: ''
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setInputMode(connection ? 'manual' : 'url')
      setUrlInput('')
      setConnectionName(connection?.name || '')
      setFormData({
        host: connection?.host || '',
        port: connection?.port || 5432,
        database: connection?.database || '',
        username: connection?.username || '',
        password: ''
      })
      setTestResult(null)
    }
  }, [open, connection])

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const getConnectionData = (): { config: Omit<Connection, 'id'>; password: string } | null => {
    if (inputMode === 'url') {
      const parsed = parseConnectionUrl(urlInput)
      if (!parsed) return null
      return {
        config: {
          name: connectionName || `${parsed.host}:${parsed.port}/${parsed.database}`,
          adapter: 'postgres',
          host: parsed.host,
          port: parsed.port,
          database: parsed.database,
          username: parsed.username
        },
        password: parsed.password
      }
    } else {
      return {
        config: {
          name: connectionName || `${formData.host}:${formData.port}/${formData.database}`,
          adapter: 'postgres',
          host: formData.host,
          port: formData.port,
          database: formData.database,
          username: formData.username
        },
        password: formData.password
      }
    }
  }

  const handleTestConnection = async () => {
    const data = getConnectionData()
    if (!data) {
      setTestResult({ success: false, error: 'Invalid connection URL' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const config = { ...data.config, id: 'test-' + Date.now() }
      const result = await ipc.testConnection(config, data.password)
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, error: String(err) })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    const data = getConnectionData()
    if (!data) {
      setTestResult({ success: false, error: 'Invalid connection URL' })
      return
    }

    setSaving(true)

    try {
      const id = connection?.id || crypto.randomUUID()
      const newConnection: Connection = { ...data.config, id }

      // Save password to keychain
      await ipc.saveCredentials(id, data.password)

      if (connection) {
        updateConnection(connection.id, newConnection)
        onClose()
      } else {
        // Add and auto-connect for new connections
        addConnection(newConnection)
        onClose()

        // Auto-connect
        setConnectionStatus(id, 'connecting')
        setActiveConnection(id)

        const result = await ipc.connect(newConnection, data.password)
        if (result.success) {
          setConnectionStatus(id, 'connected')
        } else {
          setConnectionStatus(id, 'error')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{connection ? 'Edit Connection' : 'New Connection'}</DialogTitle>
        <DialogClose onClose={onClose} />
      </DialogHeader>

      <DialogContent className="space-y-4">
        {/* Input Mode Toggle - only show for new connections */}
        {!connection && (
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              className={cn(
                'flex-1 px-3 py-1.5 text-xs font-medium transition-colors',
                inputMode === 'url'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setInputMode('url')}
            >
              URL
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 px-3 py-1.5 text-xs font-medium transition-colors',
                inputMode === 'manual'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setInputMode('manual')}
            >
              Manual
            </button>
          </div>
        )}

        {/* URL Mode */}
        {inputMode === 'url' && !connection && (
          <>
            <div className="space-y-2">
              <Label htmlFor="url">Connection URL</Label>
              <Input
                id="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setTestResult(null)
                }}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="name"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Manual Mode */}
        {(inputMode === 'manual' || connection) && (
          <>
            {/* Connection Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Connection Name <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="name"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>

            {/* Host & Port */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  value={formData.host}
                  onChange={(e) => handleChange('host', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleChange('port', parseInt(e.target.value) || 5432)}
                />
              </div>
            </div>

            {/* Database */}
            <div className="space-y-2">
              <Label htmlFor="database">Database</Label>
              <Input
                id="database"
                value={formData.database}
                onChange={(e) => handleChange('database', e.target.value)}
              />
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* Test Result */}
        {testResult && (
          <div
            className={cn(
              'text-sm px-3 py-2 rounded-md',
              testResult.success
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            )}
          >
            {testResult.success
              ? 'Connection successful!'
              : `Connection failed: ${testResult.error || 'Unknown error'}`}
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={handleTestConnection} disabled={testing}>
          {testing && <Loader2 className="w-4 h-4 animate-spin" />}
          Test Connection
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {connection ? 'Save' : 'Save & Connect'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

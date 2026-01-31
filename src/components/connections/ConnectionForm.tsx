import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useConnectionStore, type Connection } from '@/stores/connectionStore'
import { ipc } from '@/lib/ipc'
import { Loader2 } from 'lucide-react'

interface ConnectionFormProps {
  open: boolean
  onClose: () => void
  connection?: Connection
}

export function ConnectionForm({ open, onClose, connection }: ConnectionFormProps) {
  const addConnection = useConnectionStore((state) => state.addConnection)
  const updateConnection = useConnectionStore((state) => state.updateConnection)

  const [formData, setFormData] = useState({
    name: connection?.name || '',
    host: connection?.host || 'localhost',
    port: connection?.port || 5432,
    database: connection?.database || 'postgres',
    username: connection?.username || 'postgres',
    password: '',
    ssl: connection?.ssl || false,
    sshEnabled: connection?.ssh.enabled || false,
    sshHost: connection?.ssh.host || '',
    sshPort: connection?.ssh.port || 22,
    sshUsername: connection?.ssh.username || '',
    sshPassword: '',
    sshPrivateKeyPath: connection?.ssh.privateKeyPath || ''
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const buildConnectionConfig = (id: string) => ({
    id,
    name: formData.name || `${formData.host}:${formData.port}/${formData.database}`,
    adapter: 'postgres',
    host: formData.host,
    port: formData.port,
    database: formData.database,
    username: formData.username,
    ssl: formData.ssl,
    ssh: {
      enabled: formData.sshEnabled,
      host: formData.sshHost,
      port: formData.sshPort,
      username: formData.sshUsername,
      privateKeyPath: formData.sshPrivateKeyPath || undefined
    }
  })

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const config = buildConnectionConfig('test-' + Date.now())
      const result = await ipc.testConnection(
        config,
        formData.password,
        formData.sshEnabled ? formData.sshPassword : undefined
      )
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, error: String(err) })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const id = connection?.id || crypto.randomUUID()
      const newConnection: Connection = {
        ...buildConnectionConfig(id),
        ssh: {
          enabled: formData.sshEnabled,
          host: formData.sshHost,
          port: formData.sshPort,
          username: formData.sshUsername,
          privateKeyPath: formData.sshPrivateKeyPath || undefined
        }
      }

      // Save password to keychain
      await ipc.saveCredentials(
        id,
        formData.password,
        formData.sshEnabled ? formData.sshPassword : undefined
      )

      if (connection) {
        updateConnection(connection.id, newConnection)
      } else {
        addConnection(newConnection)
      }

      onClose()
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
        {/* Connection Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Connection Name</Label>
          <Input
            id="name"
            placeholder="My Database"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
          />
        </div>

        {/* Host & Port */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              placeholder="localhost"
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
            placeholder="postgres"
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
              placeholder="postgres"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
            />
          </div>
        </div>

        {/* SSL Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="ssl">Use SSL</Label>
          <Switch
            checked={formData.ssl}
            onCheckedChange={(checked) => handleChange('ssl', checked)}
          />
        </div>

        {/* SSH Tunnel Section */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <Label htmlFor="ssh">SSH Tunnel</Label>
            <Switch
              checked={formData.sshEnabled}
              onCheckedChange={(checked) => handleChange('sshEnabled', checked)}
            />
          </div>

          {formData.sshEnabled && (
            <div className="space-y-4">
              {/* SSH Host & Port */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="sshHost">SSH Host</Label>
                  <Input
                    id="sshHost"
                    placeholder="bastion.example.com"
                    value={formData.sshHost}
                    onChange={(e) => handleChange('sshHost', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sshPort">SSH Port</Label>
                  <Input
                    id="sshPort"
                    type="number"
                    value={formData.sshPort}
                    onChange={(e) => handleChange('sshPort', parseInt(e.target.value) || 22)}
                  />
                </div>
              </div>

              {/* SSH Username */}
              <div className="space-y-2">
                <Label htmlFor="sshUsername">SSH Username</Label>
                <Input
                  id="sshUsername"
                  placeholder="ubuntu"
                  value={formData.sshUsername}
                  onChange={(e) => handleChange('sshUsername', e.target.value)}
                />
              </div>

              {/* SSH Private Key Path */}
              <div className="space-y-2">
                <Label htmlFor="sshPrivateKeyPath">Private Key Path (optional)</Label>
                <Input
                  id="sshPrivateKeyPath"
                  placeholder="~/.ssh/id_rsa"
                  value={formData.sshPrivateKeyPath}
                  onChange={(e) => handleChange('sshPrivateKeyPath', e.target.value)}
                />
              </div>

              {/* SSH Password (if no key) */}
              {!formData.sshPrivateKeyPath && (
                <div className="space-y-2">
                  <Label htmlFor="sshPassword">SSH Password</Label>
                  <Input
                    id="sshPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.sshPassword}
                    onChange={(e) => handleChange('sshPassword', e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`text-sm px-3 py-2 rounded-md ${
              testResult.success
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            }`}
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
          Save
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

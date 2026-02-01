import type { DatabaseAdapter, AdapterFactory } from './types'

class PluginRegistry {
  private factories = new Map<string, AdapterFactory>()
  private instances = new Map<string, DatabaseAdapter>()

  register(id: string, factory: AdapterFactory): void {
    if (this.factories.has(id)) {
      throw new Error(`Adapter with id "${id}" is already registered`)
    }
    this.factories.set(id, factory)
  }

  getAvailableAdapters(): Array<{ id: string; name: string; icon: string }> {
    return Array.from(this.factories.entries()).map(([id, factory]) => {
      const adapter = factory()
      return { id, name: adapter.name, icon: adapter.icon }
    })
  }

  createInstance(adapterId: string, instanceId: string): DatabaseAdapter {
    const factory = this.factories.get(adapterId)
    if (!factory) {
      throw new Error(`Unknown adapter: ${adapterId}`)
    }

    const instance = factory()
    this.instances.set(instanceId, instance)
    return instance
  }

  getInstance(instanceId: string): DatabaseAdapter | undefined {
    return this.instances.get(instanceId)
  }

  removeInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId)
    if (instance?.isConnected()) {
      instance.disconnect()
    }
    this.instances.delete(instanceId)
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.instances.values())
      .filter((adapter) => adapter.isConnected())
      .map((adapter) => adapter.disconnect())

    await Promise.all(disconnectPromises)
    this.instances.clear()
  }
}

// Singleton instance
export const pluginRegistry = new PluginRegistry()

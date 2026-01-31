import { Client } from 'ssh2'
import { createServer, Server, AddressInfo } from 'net'
import { readFile } from 'fs/promises'

export interface SSHTunnelConfig {
  sshHost: string
  sshPort: number
  sshUsername: string
  sshPassword?: string
  sshPrivateKeyPath?: string
  remoteHost: string
  remotePort: number
}

export interface SSHTunnel {
  localPort: number
  close: () => Promise<void>
}

interface AuthConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: Buffer
}

class SSHTunnelManager {
  private tunnels = new Map<string, { server: Server; client: Client }>()

  async createTunnel(id: string, config: SSHTunnelConfig): Promise<SSHTunnel> {
    // Close existing tunnel if any
    await this.closeTunnel(id)

    // Prepare authentication
    const authConfig: AuthConfig = {
      host: config.sshHost,
      port: config.sshPort,
      username: config.sshUsername
    }

    if (config.sshPrivateKeyPath) {
      authConfig.privateKey = await readFile(config.sshPrivateKeyPath)
    } else if (config.sshPassword) {
      authConfig.password = config.sshPassword
    } else {
      throw new Error('No SSH authentication method provided')
    }

    return this.establishTunnel(id, config, authConfig)
  }

  private establishTunnel(
    id: string,
    config: SSHTunnelConfig,
    authConfig: AuthConfig
  ): Promise<SSHTunnel> {
    return new Promise((resolve, reject) => {
      const sshClient = new Client()

      // Create local server to handle connections
      const localServer = createServer((socket) => {
        sshClient.forwardOut(
          '127.0.0.1',
          0,
          config.remoteHost,
          config.remotePort,
          (err, stream) => {
            if (err) {
              socket.end()
              return
            }
            socket.pipe(stream).pipe(socket)
          }
        )
      })

      sshClient.on('ready', () => {
        localServer.listen(0, '127.0.0.1', () => {
          const address = localServer.address() as AddressInfo
          this.tunnels.set(id, { server: localServer, client: sshClient })

          resolve({
            localPort: address.port,
            close: () => this.closeTunnel(id)
          })
        })
      })

      sshClient.on('error', (err) => {
        localServer.close()
        reject(new Error(`SSH connection error: ${err.message}`))
      })

      sshClient.connect(authConfig)
    })
  }

  async closeTunnel(id: string): Promise<void> {
    const tunnel = this.tunnels.get(id)
    if (tunnel) {
      tunnel.server.close()
      tunnel.client.end()
      this.tunnels.delete(id)
    }
  }

  async closeAllTunnels(): Promise<void> {
    const closePromises = Array.from(this.tunnels.keys()).map((id) =>
      this.closeTunnel(id)
    )
    await Promise.all(closePromises)
  }

  hasTunnel(id: string): boolean {
    return this.tunnels.has(id)
  }
}

export const sshTunnelManager = new SSHTunnelManager()

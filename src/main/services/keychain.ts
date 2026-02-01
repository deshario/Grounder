import keytar from 'keytar'

const SERVICE_NAME = 'Grounder'

export interface KeychainCredential {
  connectionId: string
  type: 'database' | 'ssh'
}

function getAccountName(cred: KeychainCredential): string {
  return `${cred.connectionId}:${cred.type}`
}

export const keychainService = {
  async setPassword(cred: KeychainCredential, password: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, getAccountName(cred), password)
  },

  async getPassword(cred: KeychainCredential): Promise<string | null> {
    return keytar.getPassword(SERVICE_NAME, getAccountName(cred))
  },

  async deletePassword(cred: KeychainCredential): Promise<boolean> {
    return keytar.deletePassword(SERVICE_NAME, getAccountName(cred))
  },

  async deleteConnectionCredentials(connectionId: string): Promise<void> {
    await Promise.all([
      keytar.deletePassword(SERVICE_NAME, `${connectionId}:database`),
      keytar.deletePassword(SERVICE_NAME, `${connectionId}:ssh`)
    ])
  },

  async findCredentials(): Promise<Array<{ account: string; password: string }>> {
    return keytar.findCredentials(SERVICE_NAME)
  }
}

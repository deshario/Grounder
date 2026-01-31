import { create } from 'zustand'

export interface TableTab {
  id: string
  type: 'table'
  title: string
  connectionId: string
  tableName: string
  schema: string
}

export interface QueryTab {
  id: string
  type: 'query'
  title: string
  connectionId: string
  query: string
}

export type Tab = TableTab | QueryTab

interface TabState {
  tabs: Tab[]
  activeTabId: string | null

  // Actions
  openTableTab: (connectionId: string, tableName: string, schema: string) => void
  openQueryTab: (connectionId: string) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string | null) => void
  updateQueryTab: (tabId: string, query: string) => void
}

export const useTabStore = create<TabState>()((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTableTab: (connectionId, tableName, schema) => {
    const existingTab = get().tabs.find(
      (tab) =>
        tab.type === 'table' &&
        tab.connectionId === connectionId &&
        tab.tableName === tableName &&
        tab.schema === schema
    )

    if (existingTab) {
      set({ activeTabId: existingTab.id })
      return
    }

    const newTab: TableTab = {
      id: `table-${connectionId}-${schema}-${tableName}-${Date.now()}`,
      type: 'table',
      title: `${schema}.${tableName}`,
      connectionId,
      tableName,
      schema
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))
  },

  openQueryTab: (connectionId) => {
    const queryCount = get().tabs.filter((tab) => tab.type === 'query').length + 1
    const newTab: QueryTab = {
      id: `query-${connectionId}-${Date.now()}`,
      type: 'query',
      title: `Query ${queryCount}`,
      connectionId,
      query: ''
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))
  },

  closeTab: (tabId) =>
    set((state) => {
      const newTabs = state.tabs.filter((tab) => tab.id !== tabId)
      let newActiveTabId = state.activeTabId

      if (state.activeTabId === tabId) {
        const closedIndex = state.tabs.findIndex((tab) => tab.id === tabId)
        if (newTabs.length > 0) {
          newActiveTabId = newTabs[Math.min(closedIndex, newTabs.length - 1)].id
        } else {
          newActiveTabId = null
        }
      }

      return { tabs: newTabs, activeTabId: newActiveTabId }
    }),

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateQueryTab: (tabId, query) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && tab.type === 'query' ? { ...tab, query } : tab
      )
    }))
}))

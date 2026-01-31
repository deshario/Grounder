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

const fallbackActiveId = (tabs: Tab[], currentId: string | null) =>
  tabs.some((t) => t.id === currentId) ? currentId : tabs.at(-1)?.id ?? null

interface TabState {
  tabs: Tab[]
  activeTableTabId: string | null
  activeQueryTabId: string | null
  closeRowDetailsSignal: number

  openTableTab: (connectionId: string, tableName: string, schema: string) => void
  openQueryTab: (connectionId: string) => void
  closeTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeTabsToRight: (tabId: string) => void
  closeTableTab: (tableName: string, schema: string) => void
  setActiveTableTab: (tabId: string | null) => void
  setActiveQueryTab: (tabId: string | null) => void
  updateQueryTab: (tabId: string, query: string) => void
}

export const useTabStore = create<TabState>()((set, get) => ({
  tabs: [],
  activeTableTabId: null,
  activeQueryTabId: null,
  closeRowDetailsSignal: 0,

  openTableTab: (connectionId, tableName, schema) => {
    const existingTab = get().tabs.find(
      (tab) =>
        tab.type === 'table' &&
        tab.connectionId === connectionId &&
        tab.tableName === tableName &&
        tab.schema === schema
    )

    if (existingTab) {
      set({ activeTableTabId: existingTab.id })
      return
    }

    const newTab: TableTab = {
      id: `table-${connectionId}-${schema}-${tableName}-${Date.now()}`,
      type: 'table',
      title: tableName,
      connectionId,
      tableName,
      schema
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTableTabId: newTab.id
    }))
  },

  openQueryTab: (connectionId) => {
    const existingQueryTabs = get().tabs.filter((t) => t.type === 'query')
    const isFirstQueryTab = existingQueryTabs.length === 0
    const newTab: QueryTab = {
      id: `query-${connectionId}-${Date.now()}`,
      type: 'query',
      title: `Query ${existingQueryTabs.length + 1}`,
      connectionId,
      query: 'SELECT * FROM '
    }

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeQueryTabId: newTab.id,
      closeRowDetailsSignal: isFirstQueryTab ? state.closeRowDetailsSignal + 1 : state.closeRowDetailsSignal
    }))
  },

  closeTab: (tabId) =>
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId)
      const tableTabs = newTabs.filter((t) => t.type === 'table')
      const queryTabs = newTabs.filter((t) => t.type === 'query')
      return {
        tabs: newTabs,
        activeTableTabId: fallbackActiveId(tableTabs, state.activeTableTabId),
        activeQueryTabId: fallbackActiveId(queryTabs, state.activeQueryTabId)
      }
    }),

  closeOtherTabs: (tabId) =>
    set((state) => {
      const keepTab = state.tabs.find((t) => t.id === tabId)
      if (!keepTab) return state

      return {
        tabs: [keepTab],
        activeTableTabId: keepTab.type === 'table' ? tabId : null,
        activeQueryTabId: keepTab.type === 'query' ? tabId : null
      }
    }),

  closeTabsToRight: (tabId) =>
    set((state) => {
      const tabIndex = state.tabs.findIndex((t) => t.id === tabId)
      if (tabIndex === -1) return state

      const newTabs = state.tabs.slice(0, tabIndex + 1)
      const tableTabs = newTabs.filter((t) => t.type === 'table')
      const queryTabs = newTabs.filter((t) => t.type === 'query')
      return {
        tabs: newTabs,
        activeTableTabId: fallbackActiveId(tableTabs, state.activeTableTabId),
        activeQueryTabId: fallbackActiveId(queryTabs, state.activeQueryTabId)
      }
    }),

  closeTableTab: (tableName, schema) =>
    set((state) => {
      const tabToClose = state.tabs.find(
        (t) => t.type === 'table' && t.tableName === tableName && t.schema === schema
      )
      if (!tabToClose) return state

      const newTabs = state.tabs.filter((t) => t.id !== tabToClose.id)
      const tableTabs = newTabs.filter((t) => t.type === 'table')
      return {
        tabs: newTabs,
        activeTableTabId: fallbackActiveId(tableTabs, state.activeTableTabId),
        activeQueryTabId: state.activeQueryTabId
      }
    }),

  setActiveTableTab: (tabId) => set({ activeTableTabId: tabId }),
  setActiveQueryTab: (tabId) => set({ activeQueryTabId: tabId }),

  updateQueryTab: (tabId, query) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && tab.type === 'query' ? { ...tab, query } : tab
      )
    }))
}))

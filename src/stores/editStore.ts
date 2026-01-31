import { create } from 'zustand'

export interface CellEdit {
  rowIndex: number
  columnId: string
  originalValue: unknown
  newValue: unknown
}

interface EditState {
  // Map of tabId -> array of cell edits
  pendingEdits: Record<string, CellEdit[]>
  // Currently editing cell (tabId:rowIndex:columnId)
  editingCell: string | null

  // Actions
  setEditingCell: (tabId: string, rowIndex: number, columnId: string) => void
  clearEditingCell: () => void
  addEdit: (tabId: string, edit: CellEdit) => void
  removeEdit: (tabId: string, rowIndex: number, columnId: string) => void
  clearEdits: (tabId: string) => void
  getEdit: (tabId: string, rowIndex: number, columnId: string) => CellEdit | undefined
  hasEdits: (tabId: string) => boolean
}

export const useEditStore = create<EditState>()((set, get) => ({
  pendingEdits: {},
  editingCell: null,

  setEditingCell: (tabId, rowIndex, columnId) =>
    set({ editingCell: `${tabId}:${rowIndex}:${columnId}` }),

  clearEditingCell: () => set({ editingCell: null }),

  addEdit: (tabId, edit) =>
    set((state) => {
      const tabEdits = state.pendingEdits[tabId] || []
      // Remove any existing edit for this cell
      const filtered = tabEdits.filter(
        (e) => !(e.rowIndex === edit.rowIndex && e.columnId === edit.columnId)
      )
      // Only add if value is different from original
      if (edit.newValue !== edit.originalValue) {
        filtered.push(edit)
      }
      return {
        pendingEdits: {
          ...state.pendingEdits,
          [tabId]: filtered
        }
      }
    }),

  removeEdit: (tabId, rowIndex, columnId) =>
    set((state) => {
      const tabEdits = state.pendingEdits[tabId] || []
      return {
        pendingEdits: {
          ...state.pendingEdits,
          [tabId]: tabEdits.filter(
            (e) => !(e.rowIndex === rowIndex && e.columnId === columnId)
          )
        }
      }
    }),

  clearEdits: (tabId) =>
    set((state) => {
      const { [tabId]: _, ...rest } = state.pendingEdits
      void _ // Intentionally unused
      return { pendingEdits: rest }
    }),

  getEdit: (tabId, rowIndex, columnId) => {
    const tabEdits = get().pendingEdits[tabId] || []
    return tabEdits.find(
      (e) => e.rowIndex === rowIndex && e.columnId === columnId
    )
  },

  hasEdits: (tabId) => {
    const tabEdits = get().pendingEdits[tabId] || []
    return tabEdits.length > 0
  }
}))

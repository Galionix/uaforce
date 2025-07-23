import { create } from 'zustand'

export const useStore = create((set) => ({
  showGlobalLoading: true,
  removeGlobalLoading: () => set((state) => ({ showGlobalLoading: false })),
}))

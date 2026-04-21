import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Group } from '@/lib/types'

interface GroupStore {
  activeGroupId: string | null
  groups: Group[]
  setActiveGroup: (id: string) => void
  setGroups: (groups: Group[]) => void
  activeGroup: () => Group | null
}

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      activeGroupId: null,
      groups: [],
      setActiveGroup: (id) => set({ activeGroupId: id }),
      setGroups: (groups) => set({ groups }),
      activeGroup: () => {
        const { groups, activeGroupId } = get()
        return groups.find(g => g.id === activeGroupId) ?? groups[0] ?? null
      },
    }),
    { name: 'canchita-group' }
  )
)

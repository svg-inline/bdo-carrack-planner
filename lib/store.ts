"use client";

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { createInitialProfile, normalizeGear, normalizePersistedState, normalizeProfile } from "@/lib/profile";
import type { GearKey, GearState, MaterialId, PlannerProfile, ShipBranch } from "@/types";

interface PlannerStore {
  profile: PlannerProfile;
  completedQuests: Record<string, string>;
  storageAvailable: boolean;
  setProfile: (patch: Partial<PlannerProfile>) => void;
  setMaterial: (id: MaterialId, value: number) => void;
  setGear: (branch: ShipBranch, key: GearKey, patch: Partial<GearState>) => void;
  completeOnboarding: () => void;
  toggleQuest: (id: string, resetKey: string) => void;
  resetAll: () => void;
}

type SavedState = Pick<PlannerStore, "profile" | "completedQuests">;

function storageFailed() {
  if (usePlannerStore.getState().storageAvailable) {
    usePlannerStore.setState({ storageAvailable: false });
  }
}

const safeStorage: PersistStorage<SavedState> = {
  getItem(name) {
    try {
      const raw = window.localStorage.getItem(name);
      return raw ? JSON.parse(raw) : null;
    } catch {
      storageFailed();
      return null;
    }
  },
  setItem(name, value) {
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch {
      storageFailed();
    }
  },
  removeItem(name) {
    try {
      window.localStorage.removeItem(name);
    } catch {
      storageFailed();
    }
  },
};

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      profile: createInitialProfile(), completedQuests: {}, storageAvailable: true,
      setProfile: (patch) => set((state) => ({ profile: normalizeProfile({ ...state.profile, ...patch }) })),
      setMaterial: (id, value) => set((state) => ({
        profile: normalizeProfile({ ...state.profile, materials: { ...state.profile.materials, [id]: value } }),
      })),
      setGear: (branch, key, patch) => set((state) => ({
        profile: {
          ...state.profile,
          gear: {
            ...state.profile.gear,
            [branch]: {
              ...state.profile.gear[branch],
              [key]: normalizeGear({ ...state.profile.gear[branch][key], ...patch }),
            },
          },
        },
      })),
      completeOnboarding: () => set((state) => ({ profile: { ...state.profile, initialized: true } })),
      toggleQuest: (id, resetKey) => set((state) => ({
        completedQuests: { ...state.completedQuests, [id]: state.completedQuests[id] === resetKey ? "" : resetKey },
      })),
      resetAll: () => set({ profile: createInitialProfile(), completedQuests: {} }),
    }),
    {
      name: "bdo-carrack-ledger-v1", version: 3, storage: safeStorage, skipHydration: true,
      partialize: ({ profile, completedQuests }) => ({ profile, completedQuests }),
      migrate: normalizePersistedState,
      merge: (saved, current) => ({ ...current, ...normalizePersistedState(saved) }),
    },
  ),
);

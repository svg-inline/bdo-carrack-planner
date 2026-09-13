"use client";

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { CARRACKS } from "@/lib/data";
import { createPreset, normalizeGear, normalizePersistedState, normalizeProfile } from "@/lib/profile";
import type { CarrackTarget, GearKey, GearState, MaterialId, PlannerPreset, PlannerProfile, ShipBranch } from "@/types";

interface PlannerStore {
  presets: PlannerPreset[];
  activePresetId: string | null;
  storageAvailable: boolean;
  addPreset: (target: CarrackTarget) => void;
  selectPreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  removePreset: (id: string) => void;
  setProfile: (patch: Partial<PlannerProfile>) => void;
  setMaterial: (id: MaterialId, value: number) => void;
  setGear: (branch: ShipBranch, key: GearKey, patch: Partial<GearState>) => void;
  setCarrackGear: (key: GearKey, patch: Partial<GearState>) => void;
  toggleQuest: (id: string, resetKey: string) => void;
  resetAll: () => void;
}

type SavedState = Pick<PlannerStore, "presets" | "activePresetId">;

function storageFailed() {
  if (usePlannerStore.getState().storageAvailable) usePlannerStore.setState({ storageAvailable: false });
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

function createPresetId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function updateActivePreset(state: PlannerStore, update: (preset: PlannerPreset) => PlannerPreset) {
  return { presets: state.presets.map((preset) => preset.id === state.activePresetId ? update(preset) : preset) };
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      presets: [], activePresetId: null, storageAvailable: true,
      addPreset: (target) => set((state) => {
        const baseName = CARRACKS[target].shortName;
        const usedNames = new Set(state.presets.map((preset) => preset.name));
        let duplicateNumber = 1;
        while (usedNames.has(`${baseName} ${duplicateNumber}`)) duplicateNumber += 1;
        const id = createPresetId();
        const name = `${baseName} ${duplicateNumber}`;
        return { presets: [...state.presets, createPreset(id, target, name)], activePresetId: id };
      }),
      selectPreset: (id) => set((state) => state.presets.some((preset) => preset.id === id) ? { activePresetId: id } : {}),
      renamePreset: (id, name) => set((state) => ({
        presets: state.presets.map((preset) => preset.id === id ? { ...preset, name: name.trim().slice(0, 48) || preset.name } : preset),
      })),
      removePreset: (id) => set((state) => {
        const index = state.presets.findIndex((preset) => preset.id === id);
        if (index < 0) return {};
        const presets = state.presets.filter((preset) => preset.id !== id);
        const nextActive = state.activePresetId === id ? presets[Math.min(index, presets.length - 1)]?.id ?? null : state.activePresetId;
        return { presets, activePresetId: nextActive };
      }),
      setProfile: (patch) => set((state) => updateActivePreset(state, (preset) => ({
        ...preset, profile: normalizeProfile({ ...preset.profile, ...patch }),
      }))),
      setMaterial: (id, value) => set((state) => updateActivePreset(state, (preset) => ({
        ...preset,
        profile: normalizeProfile({ ...preset.profile, materials: { ...preset.profile.materials, [id]: value } }),
      }))),
      setGear: (branch, key, patch) => set((state) => updateActivePreset(state, (preset) => ({
        ...preset,
        profile: {
          ...preset.profile,
          gear: {
            ...preset.profile.gear,
            [branch]: {
              ...preset.profile.gear[branch],
              [key]: normalizeGear({ ...preset.profile.gear[branch][key], ...patch }),
            },
          },
        },
      }))),
      setCarrackGear: (key, patch) => set((state) => updateActivePreset(state, (preset) => ({
        ...preset,
        profile: {
          ...preset.profile,
          carrackGear: {
            ...preset.profile.carrackGear,
            [key]: normalizeGear({ ...preset.profile.carrackGear[key], ...patch }),
          },
        },
      }))),
      toggleQuest: (id, resetKey) => set((state) => updateActivePreset(state, (preset) => ({
        ...preset,
        completedQuests: { ...preset.completedQuests, [id]: preset.completedQuests[id] === resetKey ? "" : resetKey },
      }))),
      resetAll: () => set({ presets: [], activePresetId: null }),
    }),
    {
      name: "bdo-carrack-ledger-v1", version: 5, storage: safeStorage, skipHydration: true,
      partialize: ({ presets, activePresetId }) => ({ presets, activePresetId }),
      migrate: normalizePersistedState,
      merge: (saved, current) => ({ ...current, ...normalizePersistedState(saved) }),
    },
  ),
);

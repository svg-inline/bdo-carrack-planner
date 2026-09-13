"use client";

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { CARRACKS } from "@/lib/data";
import { createPreset, normalizeGear, normalizePersistedState, normalizeProfile } from "@/lib/profile";
import { setQuestActive } from "@/lib/quests";
import { PRESET_SCHEMA_VERSION } from "@/lib/schema";
import { LOCAL_STORAGE_KEY, mergePending, storageKeyFor } from "@/lib/sync";
import type { CarrackTarget, GearKey, GearState, MaterialId, PlannerPreset, PlannerProfile, ShipBranch } from "@/types";

/**
 * Situação do envio para a conta. `off` é o planner sem conta, que continua sendo o modo
 * normal de uso: tudo funciona só com o armazenamento local.
 */
export type SyncStatus = "off" | "loading" | "saving" | "saved" | "pending" | "error" | "outdated";

interface PlannerStore {
  presets: PlannerPreset[];
  activePresetId: string | null;
  storageAvailable: boolean;
  /** Conta dona do estado em memória, ou `null` no modo anônimo. */
  accountId: string | null;
  syncStatus: SyncStatus;
  /** Presets alterados que ainda não foram aceitos pelo servidor. */
  pendingPresetIds: string[];
  /** Presets excluídos aqui que ainda não foram excluídos na conta. */
  pendingRemovals: string[];
  /** Contas para as quais este navegador já ofereceu e concluiu a importação. */
  importedFor: string[];
  addPreset: (target: CarrackTarget) => void;
  selectPreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  removePreset: (id: string) => void;
  setProfile: (patch: Partial<PlannerProfile>) => void;
  setMaterial: (id: MaterialId, value: number) => void;
  setGear: (branch: ShipBranch, key: GearKey, patch: Partial<GearState>) => void;
  setCarrackGear: (key: GearKey, patch: Partial<GearState>) => void;
  toggleQuest: (id: string, resetKey: string) => void;
  setQuestActive: (id: string, active: boolean) => void;
  resetAll: () => void;
  setAccount: (accountId: string | null) => void;
  setSyncStatus: (status: SyncStatus) => void;
  adoptRemotePresets: (presets: PlannerPreset[]) => void;
  addImportedPresets: (presets: PlannerPreset[]) => void;
  markImported: (accountId: string) => void;
  settlePreset: (id: string) => void;
  settleRemoval: (id: string) => void;
}

type SavedState = Pick<PlannerStore, "presets" | "activePresetId" | "pendingPresetIds" | "pendingRemovals" | "importedFor">;

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

export function createPresetId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * As filas de envio também são salvas no navegador. Se o jogador fecha a aba dentro da pausa
 * que antecede o salvamento, o progresso ainda está aqui, e ao reabrir o planner precisa saber
 * que falta mandá-lo. Ver ADR 0001, decisão 7.
 */
function normalizeSyncQueues(value: unknown) {
  const state = value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    pendingPresetIds: stringList(state.pendingPresetIds),
    pendingRemovals: stringList(state.pendingRemovals),
    importedFor: stringList(state.importedFor),
  };
}

/**
 * Toda alteração de preset entra na fila de envio no mesmo lugar em que altera o estado. É
 * explícito de propósito: comparar listas depois não distinguiria uma edição do jogador de
 * uma carga vinda do servidor, e o planner acabaria devolvendo ao servidor o que ele mandou.
 */
function updateActivePreset(state: PlannerStore, update: (preset: PlannerPreset) => PlannerPreset) {
  if (!state.activePresetId) return {};
  return {
    presets: state.presets.map((preset) => preset.id === state.activePresetId ? update(preset) : preset),
    ...queue(state, state.activePresetId),
  };
}

function queue(state: PlannerStore, id: string) {
  if (!state.accountId) return {};
  return { pendingPresetIds: mergePending(state.pendingPresetIds, [id]), syncStatus: "pending" as SyncStatus };
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      presets: [], activePresetId: null, storageAvailable: true,
      accountId: null, syncStatus: "off", pendingPresetIds: [], pendingRemovals: [], importedFor: [],
      addPreset: (target) => set((state) => {
        const baseName = CARRACKS[target].shortName;
        const usedNames = new Set(state.presets.map((preset) => preset.name));
        let duplicateNumber = 1;
        while (usedNames.has(`${baseName} ${duplicateNumber}`)) duplicateNumber += 1;
        const id = createPresetId();
        const name = `${baseName} ${duplicateNumber}`;
        return { presets: [...state.presets, createPreset(id, target, name)], activePresetId: id, ...queue(state, id) };
      }),
      selectPreset: (id) => set((state) => state.presets.some((preset) => preset.id === id) ? { activePresetId: id } : {}),
      renamePreset: (id, name) => set((state) => ({
        presets: state.presets.map((preset) => preset.id === id ? { ...preset, name: name.trim().slice(0, 48) || preset.name } : preset),
        ...queue(state, id),
      })),
      removePreset: (id) => set((state) => {
        const index = state.presets.findIndex((preset) => preset.id === id);
        if (index < 0) return {};
        const presets = state.presets.filter((preset) => preset.id !== id);
        const nextActive = state.activePresetId === id ? presets[Math.min(index, presets.length - 1)]?.id ?? null : state.activePresetId;
        const removal = state.accountId
          ? { pendingRemovals: mergePending(state.pendingRemovals, [id]), pendingPresetIds: state.pendingPresetIds.filter((pending) => pending !== id), syncStatus: "pending" as SyncStatus }
          : {};
        return { presets, activePresetId: nextActive, ...removal };
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
      setQuestActive: (id, active) => set((state) => updateActivePreset(state, (preset) => ({
        ...preset,
        profile: { ...preset.profile, activeQuests: setQuestActive(preset.profile.activeQuests, id, active) },
      }))),
      // Limpa apenas este navegador. Apagar o que está na conta é ação separada e explícita,
      // para o botão de redefinir não virar exclusão remota sem o jogador esperar por isso.
      resetAll: () => set((state) => ({
        presets: [], activePresetId: null, pendingPresetIds: [], pendingRemovals: [],
        syncStatus: state.accountId ? "saved" : "off",
      })),
      setAccount: (accountId) => set({ accountId }),
      setSyncStatus: (syncStatus) => set({ syncStatus }),
      adoptRemotePresets: (presets) => set((state) => ({
        presets,
        activePresetId: presets.some((preset) => preset.id === state.activePresetId) ? state.activePresetId : presets[0]?.id ?? null,
      })),
      addImportedPresets: (presets) => set((state) => ({
        presets: [...state.presets, ...presets],
        activePresetId: state.activePresetId ?? presets[0]?.id ?? null,
        pendingPresetIds: mergePending(state.pendingPresetIds, presets.map((preset) => preset.id)),
        syncStatus: presets.length ? "pending" : state.syncStatus,
      })),
      markImported: (accountId) => set((state) => ({ importedFor: mergePending(state.importedFor, [accountId]) })),
      settlePreset: (id) => set((state) => ({ pendingPresetIds: state.pendingPresetIds.filter((pending) => pending !== id) })),
      settleRemoval: (id) => set((state) => ({ pendingRemovals: state.pendingRemovals.filter((pending) => pending !== id) })),
    }),
    {
      name: LOCAL_STORAGE_KEY, version: PRESET_SCHEMA_VERSION, storage: safeStorage, skipHydration: true,
      partialize: ({ presets, activePresetId, pendingPresetIds, pendingRemovals, importedFor }) =>
        ({ presets, activePresetId, pendingPresetIds, pendingRemovals, importedFor }),
      migrate: (saved) => ({ ...normalizePersistedState(saved), ...normalizeSyncQueues(saved) }),
      merge: (saved, current) => ({ ...current, ...normalizePersistedState(saved), ...normalizeSyncQueues(saved) }),
    },
  ),
);

/**
 * Troca o espaço de armazenamento ao entrar ou sair da conta. Sem isso, sair num computador
 * compartilhado deixaria o progresso no cache para o próximo, e entrar com outra conta
 * misturaria dois jogadores no mesmo estado local. Ver ADR 0001, decisão 7.
 */
export async function switchStorageScope(accountId: string | null) {
  usePlannerStore.persist.setOptions({ name: storageKeyFor(accountId) });
  // Zustand não chama `merge` quando a chave nova está vazia, então o estado é esvaziado
  // antes de hidratar: o que era do escopo anterior não pode sobrar em memória.
  usePlannerStore.setState({ presets: [], activePresetId: null, pendingPresetIds: [], pendingRemovals: [], importedFor: [] });
  await usePlannerStore.persist.rehydrate();
}

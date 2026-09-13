"use client";

import { CloudError, deletePreset, fetchPresets, savePreset } from "@/lib/cloud";
import { usePlannerStore } from "@/lib/store";

/** Um envio de cada vez: duas execuções em paralelo disputariam a mesma fila. */
let running = false;

function statusForError(error: unknown) {
  // Um registro gravado por uma versão mais nova do site: esta aba passa a só ler, porque
  // regravá-lo apagaria campos que ela não conhece. Ver ADR 0001, decisão 5.
  return error instanceof CloudError && error.reason === "versao-desatualizada" ? "outdated" as const : "error" as const;
}

/**
 * Envia o que está pendente, uma exclusão ou um preset por vez. Só sai da fila o que o
 * servidor aceitou, então uma falha deixa o aviso de pendência de pé e a próxima tentativa
 * recomeça de onde parou.
 */
export async function flushPending(): Promise<boolean> {
  if (running) return false;
  const store = usePlannerStore.getState();
  if (!store.accountId) return true;
  if (!store.pendingPresetIds.length && !store.pendingRemovals.length) return true;

  running = true;
  store.setSyncStatus("saving");
  try {
    for (const id of [...store.pendingRemovals]) {
      await deletePreset(id);
      usePlannerStore.getState().settleRemoval(id);
    }

    for (const id of [...store.pendingPresetIds]) {
      const sent = usePlannerStore.getState().presets.find((preset) => preset.id === id);
      if (!sent) {
        usePlannerStore.getState().settlePreset(id);
        continue;
      }
      await savePreset(sent);
      // Se o jogador editou este preset enquanto ele subia, o objeto em memória já é outro e
      // a pendência continua de pé — o que acabou de ser enviado não é mais o estado atual.
      if (usePlannerStore.getState().presets.find((preset) => preset.id === id) === sent) {
        usePlannerStore.getState().settlePreset(id);
      }
    }

    const left = usePlannerStore.getState();
    left.setSyncStatus(left.pendingPresetIds.length || left.pendingRemovals.length ? "pending" : "saved");
    return true;
  } catch (error) {
    usePlannerStore.getState().setSyncStatus(statusForError(error));
    return false;
  } finally {
    running = false;
  }
}

/**
 * Carrega o progresso da conta. O que estiver pendente sobe antes, porque representa edição
 * mais recente que a do servidor; se esse envio falhar, a carga é abortada em vez de
 * substituir o estado local por uma versão mais velha.
 */
export async function loadFromCloud(): Promise<boolean> {
  const store = usePlannerStore.getState();
  if (!store.accountId) return false;

  if (store.pendingPresetIds.length || store.pendingRemovals.length) {
    if (!(await flushPending())) return false;
  }

  store.setSyncStatus("loading");
  try {
    const cloud = await fetchPresets();
    const current = usePlannerStore.getState();
    current.adoptRemotePresets(cloud.presets);
    current.setSyncStatus(cloud.outdated ? "outdated" : "saved");
    return true;
  } catch (error) {
    usePlannerStore.getState().setSyncStatus(statusForError(error));
    return false;
  }
}

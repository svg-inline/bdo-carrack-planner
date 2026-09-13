// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { switchStorageScope, usePlannerStore } from "@/lib/store";
import { PRESET_SCHEMA_VERSION } from "@/lib/schema";
import { LOCAL_STORAGE_KEY, storageKeyFor } from "@/lib/sync";
import { createPreset } from "@/lib/profile";
import type { PlannerPreset } from "@/types";

function seed(name: string, state: { presets?: PlannerPreset[]; activePresetId?: string | null; pendingPresetIds?: string[]; importedFor?: string[] }) {
  window.localStorage.setItem(name, JSON.stringify({ state, version: PRESET_SCHEMA_VERSION }));
}

function stored(name: string) {
  return JSON.parse(window.localStorage.getItem(name) ?? "null")?.state ?? null;
}

const anonimo = createPreset("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bravura", "Bravura local");
const daConta = createPreset("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "gradual", "Gradual da conta");

describe("troca de escopo do armazenamento", () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePlannerStore.persist.setOptions({ name: LOCAL_STORAGE_KEY });
    usePlannerStore.setState({ presets: [], activePresetId: null, pendingPresetIds: [], pendingRemovals: [], importedFor: [], accountId: null, syncStatus: "off" });
  });

  it("preserva a marca de importação ao entrar de novo na mesma conta", () => {
    // O convite de importação não pode reaparecer depois de resolvido: a marca fica no escopo
    // da conta, neste navegador, e precisa sobreviver à troca de escopo do login.
    seed(storageKeyFor("u1"), { presets: [daConta], activePresetId: daConta.id, importedFor: ["u1"] });

    switchStorageScope("u1");

    expect(usePlannerStore.getState().importedFor).toEqual(["u1"]);
    expect(usePlannerStore.getState().presets.map((preset) => preset.name)).toEqual(["Gradual da conta"]);
  });

  it("não apaga o escopo de destino ao entrar", () => {
    seed(storageKeyFor("u1"), { presets: [daConta], importedFor: ["u1"] });

    switchStorageScope("u1");

    expect(stored(storageKeyFor("u1")).importedFor).toEqual(["u1"]);
    expect(stored(storageKeyFor("u1")).presets).toHaveLength(1);
  });

  it("mantém intacto o escopo anterior", () => {
    seed(LOCAL_STORAGE_KEY, { presets: [anonimo], activePresetId: anonimo.id });
    usePlannerStore.setState({ presets: [anonimo], activePresetId: anonimo.id });

    switchStorageScope("u1");

    expect(stored(LOCAL_STORAGE_KEY).presets.map((preset: PlannerPreset) => preset.name)).toEqual(["Bravura local"]);
  });

  it("começa vazio num escopo sem nada guardado, sem herdar o anterior", () => {
    usePlannerStore.setState({ presets: [anonimo], activePresetId: anonimo.id, importedFor: ["u9"] });

    switchStorageScope("u1");

    expect(usePlannerStore.getState().presets).toEqual([]);
    expect(usePlannerStore.getState().activePresetId).toBeNull();
    expect(usePlannerStore.getState().importedFor).toEqual([]);
  });

  it("preserva a fila de envio que ficou de uma sessão fechada antes de salvar", () => {
    seed(storageKeyFor("u1"), { presets: [daConta], activePresetId: daConta.id, pendingPresetIds: [daConta.id] });

    switchStorageScope("u1");

    expect(usePlannerStore.getState().pendingPresetIds).toEqual([daConta.id]);
  });

  it("volta ao escopo anônimo ao sair da conta", () => {
    seed(LOCAL_STORAGE_KEY, { presets: [anonimo], activePresetId: anonimo.id });
    switchStorageScope("u1");

    switchStorageScope(null);

    expect(usePlannerStore.getState().presets.map((preset) => preset.name)).toEqual(["Bravura local"]);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { usePlannerStore } from "@/lib/store";
import { createPreset } from "@/lib/profile";

describe("preset store", () => {
  beforeEach(() => usePlannerStore.getState().resetAll());

  it("supports repeated Carracas with independent progress", () => {
    usePlannerStore.getState().addPreset("bravura");
    const firstId = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().setMaterial("coxCombat", 12);

    usePlannerStore.getState().addPreset("bravura");
    const secondId = usePlannerStore.getState().activePresetId!;
    const repeated = usePlannerStore.getState().presets;

    expect(repeated.map((preset) => preset.name)).toEqual(["Bravura 1", "Bravura 2"]);
    expect(repeated.find((preset) => preset.id === firstId)?.profile.materials.coxCombat).toBe(12);
    expect(repeated.find((preset) => preset.id === secondId)?.profile.materials.coxCombat).toBe(0);
  });

  it("tracks the Shiro gear of each preset separately", () => {
    usePlannerStore.getState().addPreset("gradual");
    const gradualId = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().setCarrackGear("cannon", { baseEnhancement: 10, crafted: true, blueEnhancement: 4 });

    usePlannerStore.getState().addPreset("bravura");
    const presets = usePlannerStore.getState().presets;
    expect(presets.find((preset) => preset.id === gradualId)?.profile.carrackGear.cannon).toEqual({ baseEnhancement: 10, crafted: true, blueEnhancement: 4 });
    expect(usePlannerStore.getState().presets.at(-1)?.profile.carrackGear.cannon.crafted).toBe(false);
  });

  it("removes a preset added by mistake and keeps the remaining progress", () => {
    usePlannerStore.getState().addPreset("bravura");
    const keptId = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().setMaterial("coxCombat", 12);

    usePlannerStore.getState().addPreset("bravura");
    const mistakeId = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().removePreset(mistakeId);

    const presets = usePlannerStore.getState().presets;
    expect(presets.map((preset) => preset.id)).toEqual([keptId]);
    expect(usePlannerStore.getState().activePresetId).toBe(keptId);
    expect(presets[0]?.profile.materials.coxCombat).toBe(12);
  });

  it("guarda a rotina de missões de cada preset separadamente", () => {
    usePlannerStore.getState().addPreset("bravura");
    const comReiDoMar = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().addPreset("bravura");
    const comCacadas = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().setQuestActive("daily-okilua-kandidum", true);

    const presets = usePlannerStore.getState().presets;
    const rotina = (id: string) => presets.find((preset) => preset.id === id)!.profile.activeQuests;

    // Trilha única do Ravikel: o preset trocado abre mão do Rei do Mar Jovem, o outro não muda.
    expect(rotina(comCacadas)["daily-okilua-kandidum"]).toBe(true);
    expect(rotina(comCacadas)["daily-okilua-young-sea-king"]).toBe(false);
    expect(rotina(comReiDoMar)["daily-okilua-young-sea-king"]).toBe(true);
    expect(rotina(comReiDoMar)["daily-okilua-kandidum"]).toBe(false);

    usePlannerStore.getState().setQuestActive("daily-iliya-agitated", false);
    expect(usePlannerStore.getState().presets.find((preset) => preset.id === comCacadas)!.profile.activeQuests["daily-iliya-agitated"]).toBe(false);
  });

  it("returns to the Carraca choice after removing the last preset", () => {
    usePlannerStore.getState().addPreset("gradual");
    usePlannerStore.getState().removePreset(usePlannerStore.getState().activePresetId!);

    expect(usePlannerStore.getState().presets).toEqual([]);
    expect(usePlannerStore.getState().activePresetId).toBeNull();
  });

  it("switches between different Carraca presets", () => {
    usePlannerStore.getState().addPreset("gradual");
    const gradualId = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().addPreset("ascensao");
    usePlannerStore.getState().selectPreset(gradualId);

    expect(usePlannerStore.getState().activePresetId).toBe(gradualId);
    expect(usePlannerStore.getState().presets.find((preset) => preset.id === gradualId)?.profile.target).toBe("gradual");
  });
});

describe("fila de envio para a conta", () => {
  beforeEach(() => {
    usePlannerStore.setState({ accountId: null, pendingPresetIds: [], pendingRemovals: [], importedFor: [], syncStatus: "off" });
    usePlannerStore.getState().resetAll();
  });

  it("não acumula pendência no modo anônimo", () => {
    usePlannerStore.getState().addPreset("bravura");
    usePlannerStore.getState().setMaterial("coxCombat", 4);

    expect(usePlannerStore.getState().pendingPresetIds).toEqual([]);
    expect(usePlannerStore.getState().syncStatus).toBe("off");
  });

  it("marca o preset editado como pendente quando há conta", () => {
    usePlannerStore.getState().setAccount("u1");
    usePlannerStore.getState().addPreset("bravura");
    const id = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().setMaterial("coxCombat", 4);
    usePlannerStore.getState().setMaterial("coxCombat", 9);

    expect(usePlannerStore.getState().pendingPresetIds).toEqual([id]);
    expect(usePlannerStore.getState().syncStatus).toBe("pending");

    usePlannerStore.getState().settlePreset(id);
    expect(usePlannerStore.getState().pendingPresetIds).toEqual([]);
  });

  it("enfileira a exclusão e tira o preset da fila de envio", () => {
    usePlannerStore.getState().setAccount("u1");
    usePlannerStore.getState().addPreset("bravura");
    const id = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().removePreset(id);

    expect(usePlannerStore.getState().pendingRemovals).toEqual([id]);
    expect(usePlannerStore.getState().pendingPresetIds).toEqual([]);

    usePlannerStore.getState().settleRemoval(id);
    expect(usePlannerStore.getState().pendingRemovals).toEqual([]);
  });

  it("redefinir limpa só este navegador e não apaga nada na conta", () => {
    usePlannerStore.getState().setAccount("u1");
    usePlannerStore.getState().addPreset("bravura");
    usePlannerStore.getState().addPreset("gradual");

    usePlannerStore.getState().resetAll();

    expect(usePlannerStore.getState().presets).toEqual([]);
    // A fila de exclusão fica vazia de propósito: limpar o navegador não pode virar exclusão
    // remota silenciosa. Ver ADR 0001, decisão 7 e a nota sobre `resetAll`.
    expect(usePlannerStore.getState().pendingRemovals).toEqual([]);
    expect(usePlannerStore.getState().pendingPresetIds).toEqual([]);
  });

  it("envia os presets importados e registra a conta que já importou", () => {
    usePlannerStore.getState().setAccount("u1");
    const importados = [createPreset("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bravura", "Importada 1")];
    usePlannerStore.getState().addImportedPresets(importados);
    usePlannerStore.getState().markImported("u1");

    expect(usePlannerStore.getState().presets.map((preset) => preset.name)).toEqual(["Importada 1"]);
    expect(usePlannerStore.getState().pendingPresetIds).toEqual([importados[0].id]);
    expect(usePlannerStore.getState().importedFor).toEqual(["u1"]);
  });
});

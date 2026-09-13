import { beforeEach, describe, expect, it } from "vitest";
import { usePlannerStore } from "@/lib/store";

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

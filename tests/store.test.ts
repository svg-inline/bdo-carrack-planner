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

  it("switches between different Carraca presets", () => {
    usePlannerStore.getState().addPreset("gradual");
    const gradualId = usePlannerStore.getState().activePresetId!;
    usePlannerStore.getState().addPreset("ascensao");
    usePlannerStore.getState().selectPreset(gradualId);

    expect(usePlannerStore.getState().activePresetId).toBe(gradualId);
    expect(usePlannerStore.getState().presets.find((preset) => preset.id === gradualId)?.profile.target).toBe("gradual");
  });
});

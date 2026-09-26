import { describe, expect, it } from "vitest";
import { createInitialProfile, normalizeGear, normalizePersistedState, normalizeProfile } from "@/lib/profile";
import { bottlenecks, carrackGearCompletion, categoryCompletion, getMissing, getPlanRequired, getRequired, materialCompletion, overallCompletion, questResetKey, toPercent } from "@/lib/planner";
import { CARRACK_GEAR_SETS, GEAR_SETS, MATERIALS } from "@/lib/data";

describe("profile normalization", () => {
  it("repairs untrusted persisted values and migrates the old target", () => {
    const profile = normalizeProfile({
      initialized: true, target: "emergencia", crowCoins: -20.5,
      passOwned: true, passPoints: 999, normalChests: 3, extravagantChests: 2,
      materials: { redSeaGold: Number.NaN, coxCombat: 12.8 },
      gear: { figurehead: { baseEnhancement: 99, crafted: false, blueEnhancement: 10 } },
    });
    expect(profile.target).toBe("ascensao");
    expect(profile.crowCoins).toBe(0);
    expect(profile).not.toHaveProperty("passOwned");
    expect(profile).not.toHaveProperty("passPoints");
    expect(profile).not.toHaveProperty("normalChests");
    expect(profile).not.toHaveProperty("extravagantChests");
    expect(profile.materials.coxCombat).toBe(12);
    expect(profile.materials.redSeaGold).toBe(0);
    expect(profile.gear.galleass.figurehead).toEqual({ baseEnhancement: 10, crafted: false, blueEnhancement: 0 });
  });

  it("migrates an initialized legacy plan into a preset", () => {
    const state = normalizePersistedState({
      profile: { initialized: true, target: "gradual", materials: { coxCombat: 7 } },
      completedQuests: {},
    });
    expect(state.activePresetId).toBe("preset-migrado");
    expect(state.presets).toHaveLength(1);
    expect(state.presets[0].name).toBe("Minha Gradual");
    expect(state.presets[0].profile.materials.coxCombat).toBe(7);
  });

  it("keeps a fresh legacy session without presets", () => {
    expect(normalizePersistedState({ profile: { initialized: false } })).toEqual({ presets: [], activePresetId: null });
  });

  it("never gives blue enhancement progress before crafting", () => {
    expect(normalizeGear({ crafted: false, blueEnhancement: 10 }).blueEnhancement).toBe(0);
    expect(overallCompletion(createInitialProfile())).toBe(0);
  });
});

describe("equipamento de Shiro da Carraca", () => {
  it("starts empty and repairs persisted values", () => {
    const profile = normalizeProfile({
      target: "bravura",
      carrackGear: { figurehead: { baseEnhancement: 42, crafted: true, blueEnhancement: 7 }, sail: { crafted: false, blueEnhancement: 9 } },
    });
    expect(profile.carrackGear.figurehead).toEqual({ baseEnhancement: 10, crafted: true, blueEnhancement: 7 });
    expect(profile.carrackGear.sail).toEqual({ baseEnhancement: 0, crafted: false, blueEnhancement: 0 });
    expect(profile.carrackGear.cannon).toEqual({ baseEnhancement: 0, crafted: false, blueEnhancement: 0 });
    expect(carrackGearCompletion(createInitialProfile())).toBe(0);
  });

  it("keeps the Carrack route progress independent from the Shiro set", () => {
    const profile = createInitialProfile("bravura");
    const before = overallCompletion(profile);
    profile.materials.violentWavePlywood = 400;
    profile.materials.polishedSupport = 400;
    profile.carrackGear.cannon = { baseEnhancement: 10, crafted: true, blueEnhancement: 10 };

    expect(overallCompletion(profile)).toBe(before);
    expect(bottlenecks(profile).some((item) => item.category === "carrack-gear")).toBe(false);
    expect(carrackGearCompletion(profile)).toBe(25);
  });

  it("uses the recipe published in the official ship upgrade guide", () => {
    const cannon = CARRACK_GEAR_SETS.bravura.cannon;
    expect(cannon.name).toBe("Carraca de Epheria Bravura: Canhão de Shiro");
    expect(cannon.base).toBe("Carraca de Epheria: Canhão de Toro +10");
    expect(cannon.permit).toBe("Permissão de alteração de peça da Carraca de Epheria: Bravura");
    expect(cannon.materials).toEqual({ shiroCannonBlueprint: 10, violentWavePlywood: 100, polishedSupport: 100, waveAdhesive: 100 });
    expect(CARRACK_GEAR_SETS.ascensao.sail.permit).toContain("Emergência");
  });
});

describe("percentual de progresso", () => {
  it("não mostra 100% enquanto falta algum material", () => {
    const profile = createInitialProfile("bravura");
    for (const m of MATERIALS.filter((item) => item.category === "blue-gear")) {
      profile.materials[m.id] = getRequired(m.id, "bravura");
    }
    expect(categoryCompletion(profile, "blue-gear")).toBe(100);

    // 141 de 150 com os outros onze completos dá 99,5%, que o arredondamento comum mostrava como 100%.
    profile.materials.greatOceanIron = 141;
    expect(getMissing(profile, "greatOceanIron")).toBe(9);
    expect(categoryCompletion(profile, "blue-gear")).toBe(99);
  });

  it("não perde um ponto por erro de ponto flutuante", () => {
    expect(toPercent(0.29)).toBe(29);
    expect(toPercent(0.57)).toBe(57);
    expect(toPercent(1)).toBe(100);
  });
});

describe("peças prontas saem do cálculo", () => {
  it("desconta da meta os materiais de uma peça azul pronta", () => {
    const profile = createInitialProfile("gradual");
    profile.gear.caravel.figurehead = normalizeGear({ crafted: true });
    const figurehead = GEAR_SETS.caravel.figurehead.materials;
    expect(getPlanRequired(profile, "redSeaGold")).toBe(getRequired("redSeaGold", "gradual") - figurehead.redSeaGold!);
    expect(getPlanRequired(profile, "enhancedPlywood")).toBe(0);
    expect(getMissing(profile, "enhancedPlywood")).toBe(0);
    expect(materialCompletion(profile, "enhancedPlywood")).toBe(1);
    // Material de outra peça continua com a meta inteira.
    expect(getPlanRequired(profile, "purePearl")).toBe(getRequired("purePearl", "gradual"));
  });

  it("só considera as peças do navio de origem da Carraca escolhida", () => {
    const profile = createInitialProfile("gradual");
    profile.gear.galleass.figurehead = normalizeGear({ crafted: true });
    expect(getPlanRequired(profile, "enhancedPlywood")).toBe(getRequired("enhancedPlywood", "gradual"));
  });

  it("desconta as peças de Shiro prontas", () => {
    const profile = createInitialProfile("bravura");
    profile.carrackGear.cannon = normalizeGear({ crafted: true });
    const cannon = CARRACK_GEAR_SETS.bravura.cannon;
    expect(getPlanRequired(profile, cannon.blueprint)).toBe(0);
    expect(getPlanRequired(profile, "waveAdhesive")).toBe(getRequired("waveAdhesive", "bravura") - cannon.materials.waveAdhesive!);
  });

  it("não fala de falta de um material que as peças prontas já consumiram", () => {
    const profile = createInitialProfile("bravura");
    for (const key of Object.keys(profile.gear.galleass) as (keyof typeof profile.gear.galleass)[])
      profile.gear.galleass[key] = normalizeGear({ crafted: true });
    expect(bottlenecks(profile).some((material) => material.category === "blue-gear")).toBe(false);
  });
});

describe("quest reset keys", () => {
  it("produces deterministic daily and weekly reset keys", () => {
    const date = new Date("2026-09-13T23:00:00Z");
    expect(questResetKey("daily", date)).toBe("2026-09-13");
    expect(questResetKey("weekly", date)).toBe("week-2026-09-07");
  });
});

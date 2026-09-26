import { describe, expect, it } from "vitest";
import { createInitialProfile, MAX_FARM_RATE, normalizeFarmRates, normalizeGear, normalizePersistedState, normalizeProfile } from "@/lib/profile";
import { bottlenecks, carrackGearCompletion, categoryCompletion, getGoal, getMissing, getPlanRequired, getRequired, materialCompletion, overallCompletion, questResetKey, toPercent } from "@/lib/planner";
import { CARRACK_GEAR_SETS, GEAR_SETS, MATERIALS, YELLOW_GEAR_SETS } from "@/lib/data";

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

describe("equipamento amarelo de Falasi", () => {
  const yellow = MATERIALS.filter((material) => material.category === "yellow-gear");

  it("começa fora do cálculo: estoque guardado, sem meta nem falta", () => {
    const profile = createInitialProfile("bravura");
    profile.materials.solidCoralSupport = 40;
    expect(profile.yellowGear.included).toBe(false);
    for (const material of yellow) {
      expect(getGoal(profile, material.id)).toBe(0);
      expect(getMissing(profile, material.id)).toBe(0);
    }
    expect(profile.materials.solidCoralSupport).toBe(40);
  });

  it("ganha a meta do conjunto inteiro quando entra na conta", () => {
    const profile = createInitialProfile("gradual");
    profile.yellowGear.included = true;
    expect(getPlanRequired(profile, "solidCoralSupport")).toBe(500);
    expect(getPlanRequired(profile, "strongWavePlywood")).toBe(300);
    expect(getPlanRequired(profile, "crimsonCoralAdhesive")).toBe(200);
    expect(getPlanRequired(profile, "falasiCannonBlueprint")).toBe(10);
  });

  it("desconta a receita da peça de Falasi marcada como pronta", () => {
    const profile = createInitialProfile("ascensao");
    profile.yellowGear.included = true;
    profile.yellowGear.crafted.cannon = true;
    expect(getPlanRequired(profile, "solidCoralSupport")).toBe(375);
    expect(getPlanRequired(profile, "falasiCannonBlueprint")).toBe(0);
    expect(getPlanRequired(profile, "falasiSailBlueprint")).toBe(10);
  });

  it("não mexe na rota até a Carraca nem nos gargalos", () => {
    const profile = createInitialProfile("bravura");
    const before = overallCompletion(profile);
    profile.yellowGear.included = true;
    expect(overallCompletion(profile)).toBe(before);
    expect(bottlenecks(profile).some((material) => material.category === "yellow-gear")).toBe(false);
  });

  it("repara o que vem salvo e começa desligado em presets antigos", () => {
    expect(normalizeProfile({ target: "bravura" }).yellowGear).toEqual({
      included: false,
      crafted: { figurehead: false, plating: false, cannon: false, sail: false },
    });
    expect(normalizeProfile({ yellowGear: { included: "sim", crafted: { sail: true, cannon: 1, extra: true } } }).yellowGear).toEqual({
      included: false,
      crafted: { figurehead: false, plating: false, cannon: false, sail: true },
    });
  });

  it("cada Carraca tem as suas quatro peças, partindo do Shiro +10 da mesma posição", () => {
    for (const target of ["gradual", "equilibrio", "ascensao", "bravura"] as const) {
      for (const key of ["figurehead", "plating", "cannon", "sail"] as const) {
        const piece = YELLOW_GEAR_SETS[target][key];
        expect(piece.base).toBe(`${CARRACK_GEAR_SETS[target][key].name} +10`);
        expect(piece.materials[piece.blueprint]).toBe(10);
      }
    }
  });
});

describe("média de drop no preset", () => {
  it("aceita frações e zero, e descarta o que não é média válida", () => {
    expect(normalizeFarmRates({
      seaweedStalk: 2.555, luminousCobalt: 0, redSeaGold: -1, coxHigh: Number.NaN,
      purePearl: "3", inexistente: 5, abyssalEye: 10_000_000,
    })).toEqual({ seaweedStalk: 2.56, luminousCobalt: 0, abyssalEye: MAX_FARM_RATE });
  });

  it("começa vazia, inclusive em presets antigos", () => {
    expect(createInitialProfile().farmRates).toEqual({});
    expect(normalizeProfile({ target: "gradual" }).farmRates).toEqual({});
  });
});

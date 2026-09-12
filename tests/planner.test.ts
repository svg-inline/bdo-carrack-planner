import { describe, expect, it } from "vitest";
import { createInitialProfile, normalizeGear, normalizePersistedState, normalizeProfile } from "@/lib/profile";
import { overallCompletion, questResetKey } from "@/lib/planner";

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

describe("quest reset keys", () => {
  it("produces deterministic daily and weekly reset keys", () => {
    const date = new Date("2026-09-13T23:00:00Z");
    expect(questResetKey("daily", date)).toBe("2026-09-13");
    expect(questResetKey("weekly", date)).toBe("week-2026-09-07");
  });
});

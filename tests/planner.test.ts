import { describe, expect, it } from "vitest";
import { createInitialProfile, normalizeGear, normalizeProfile } from "@/lib/profile";
import { bestExtravagantChoices, bestNormalChestChoices, overallCompletion, questResetKey } from "@/lib/planner";
import { EXTRAVAGANT_CHEST, NORMAL_CHEST_STAGE_1, NORMAL_CHEST_STAGE_2 } from "@/lib/data";

describe("profile normalization", () => {
  it("repairs untrusted persisted values and migrates the old target", () => {
    const profile = normalizeProfile({
      initialized: true, target: "emergencia", crowCoins: -20.5, passPoints: 999,
      materials: { redSeaGold: Number.NaN, coxCombat: 12.8 },
      gear: { figurehead: { baseEnhancement: 99, crafted: false, blueEnhancement: 10 } },
    });
    expect(profile.target).toBe("ascensao");
    expect(profile.crowCoins).toBe(0);
    expect(profile.passPoints).toBe(400);
    expect(profile.materials.coxCombat).toBe(12);
    expect(profile.materials.redSeaGold).toBe(0);
    expect(profile.gear.galleass.figurehead).toEqual({ baseEnhancement: 10, crafted: false, blueEnhancement: 0 });
  });

  it("never gives blue enhancement progress before crafting", () => {
    expect(normalizeGear({ crafted: false, blueEnhancement: 10 }).blueEnhancement).toBe(0);
    expect(overallCompletion(createInitialProfile())).toBe(0);
  });
});

describe("planner recommendations", () => {
  it("omits completed chest options", () => {
    const profile = createInitialProfile();
    [...NORMAL_CHEST_STAGE_1, ...NORMAL_CHEST_STAGE_2, ...EXTRAVAGANT_CHEST].forEach(({ id }) => {
      profile.materials[id] = Number.MAX_SAFE_INTEGER;
    });
    expect(bestNormalChestChoices(profile)).toEqual({ stage1: [], stage2: [] });
    expect(bestExtravagantChoices(profile)).toEqual([]);
  });

  it("produces deterministic daily and weekly reset keys", () => {
    const date = new Date("2026-09-13T23:00:00Z");
    expect(questResetKey("daily", date)).toBe("2026-09-13");
    expect(questResetKey("weekly", date)).toBe("week-2026-09-07");
  });
});

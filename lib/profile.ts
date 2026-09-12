import { CARRACK_ORDER, MATERIALS, QUESTS } from "@/lib/data";
import type { BranchGearState, CarrackTarget, GearKey, GearState, MaterialId, PlannerProfile, ShipBranch } from "@/types";

export function nonNegativeInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, Math.floor(value))) : 0;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function normalizeGear(value: unknown): GearState {
  const gear = record(value);
  const crafted = gear.crafted === true;
  return {
    baseEnhancement: nonNegativeInteger(gear.baseEnhancement, 10),
    crafted,
    blueEnhancement: crafted ? nonNegativeInteger(gear.blueEnhancement, 10) : 0,
  };
}

export function createInitialProfile(): PlannerProfile {
  const emptySet = (): Record<GearKey, GearState> => ({
    figurehead: normalizeGear(null), plating: normalizeGear(null),
    cannon: normalizeGear(null), sail: normalizeGear(null),
  });
  return {
    initialized: false, target: "bravura", crowCoins: 0,
    materials: Object.fromEntries(MATERIALS.map((m) => [m.id, 0])) as Record<MaterialId, number>,
    gear: { caravel: emptySet(), galleass: emptySet() },
    passOwned: false, passPoints: 0, normalChests: 0, extravagantChests: 0,
  };
}

export function normalizeProfile(value: unknown): PlannerProfile {
  const raw = record(value);
  const initial = createInitialProfile();
  const rawTarget = raw.target === "emergencia" ? "ascensao" : raw.target;
  const target = CARRACK_ORDER.includes(rawTarget as CarrackTarget) ? rawTarget as CarrackTarget : initial.target;
  const materials = record(raw.materials);
  const oldGear = record(raw.gear);
  const gear: BranchGearState = initial.gear;
  for (const branch of ["caravel", "galleass"] as ShipBranch[]) {
    // The original single equipment set belonged to the galleass branch.
    const set = record(oldGear[branch] ?? (branch === "galleass" ? oldGear : null));
    for (const key of Object.keys(gear[branch]) as GearKey[]) gear[branch][key] = normalizeGear(set[key]);
  }
  return {
    initialized: raw.initialized === true, target,
    crowCoins: nonNegativeInteger(raw.crowCoins),
    materials: Object.fromEntries(MATERIALS.map((m) => [m.id, nonNegativeInteger(materials[m.id])])) as Record<MaterialId, number>,
    gear, passOwned: raw.passOwned === true, passPoints: nonNegativeInteger(raw.passPoints, 400),
    normalChests: nonNegativeInteger(raw.normalChests), extravagantChests: nonNegativeInteger(raw.extravagantChests),
  };
}

export function normalizePersistedState(value: unknown) {
  const state = record(value);
  const quests = record(state.completedQuests);
  return {
    profile: normalizeProfile(state.profile),
    completedQuests: Object.fromEntries(QUESTS.filter((q) => typeof quests[q.id] === "string").map((q) => [q.id, quests[q.id] as string])),
  };
}

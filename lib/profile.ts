import { CARRACK_ORDER, CARRACK_PART_COUNT, CARRACKS, MATERIALS, QUESTS } from "@/lib/data";
import { defaultActiveQuests, normalizeActiveQuests } from "@/lib/quests";
import type { BranchGearState, CarrackTarget, CrowSpendPlan, GearKey, GearState, MaterialId, PlannerPreset, PlannerProfile, ShipBranch } from "@/types";

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

/**
 * Acelerar materiais é o comportamento que o planner sempre teve, então um preset salvo antes
 * desta escolha continua com as duas categorias ligadas. Comprar as peças de Toro, não: são
 * 10.000 moedas cada, e ligá-las sozinho reservaria o saldo de todo mundo sem ninguém pedir.
 */
export function normalizeCrowSpend(value: unknown): CrowSpendPlan {
  const spend = record(value);
  return {
    carrackParts: spend.carrackParts === true,
    carrackPartCount: typeof spend.carrackPartCount === "number"
      ? nonNegativeInteger(spend.carrackPartCount, CARRACK_PART_COUNT) : CARRACK_PART_COUNT,
    blueGear: spend.blueGear !== false,
    carrackMaterials: spend.carrackMaterials !== false,
  };
}

export function createInitialProfile(target: CarrackTarget = "bravura"): PlannerProfile {
  const emptySet = (): Record<GearKey, GearState> => ({
    figurehead: normalizeGear(null), plating: normalizeGear(null),
    cannon: normalizeGear(null), sail: normalizeGear(null),
  });
  return {
    target, crowCoins: 0,
    crowSpend: normalizeCrowSpend(null),
    materials: Object.fromEntries(MATERIALS.map((m) => [m.id, 0])) as Record<MaterialId, number>,
    gear: { caravel: emptySet(), galleass: emptySet() },
    carrackGear: emptySet(),
    activeQuests: defaultActiveQuests(),
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
  const rawCarrackGear = record(raw.carrackGear);
  const carrackGear = initial.carrackGear;
  for (const key of Object.keys(carrackGear) as GearKey[]) carrackGear[key] = normalizeGear(rawCarrackGear[key]);
  return {
    target,
    crowCoins: nonNegativeInteger(raw.crowCoins),
    crowSpend: normalizeCrowSpend(raw.crowSpend),
    materials: Object.fromEntries(MATERIALS.map((m) => [m.id, nonNegativeInteger(materials[m.id])])) as Record<MaterialId, number>,
    gear,
    carrackGear,
    activeQuests: normalizeActiveQuests(raw.activeQuests),
  };
}

export function createPreset(id: string, target: CarrackTarget, name: string): PlannerPreset {
  return { id, name, profile: createInitialProfile(target), completedQuests: {} };
}

export function normalizePreset(value: unknown, index: number): PlannerPreset | null {
  const raw = record(value);
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  const profile = normalizeProfile(raw.profile);
  const quests = record(raw.completedQuests);
  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 48) : `Preset ${index + 1}`,
    profile,
    completedQuests: Object.fromEntries(QUESTS.filter((q) => typeof quests[q.id] === "string").map((q) => [q.id, quests[q.id] as string])),
  };
}

export function normalizePersistedState(value: unknown) {
  const state = record(value);
  const presets = Array.isArray(state.presets)
    ? state.presets.map(normalizePreset).filter((preset): preset is PlannerPreset => preset !== null)
    : [];

  if (!presets.length) {
    const legacyProfile = record(state.profile);
    if (legacyProfile.initialized === true) {
      const profile = normalizeProfile(legacyProfile);
      const quests = record(state.completedQuests);
      presets.push({
        id: "preset-migrado",
        name: `Minha ${CARRACKS[profile.target].shortName}`,
        profile,
        completedQuests: Object.fromEntries(QUESTS.filter((q) => typeof quests[q.id] === "string").map((q) => [q.id, quests[q.id] as string])),
      });
    }
  }

  const requestedActiveId = typeof state.activePresetId === "string" ? state.activePresetId : null;
  return {
    presets,
    activePresetId: presets.some((preset) => preset.id === requestedActiveId) ? requestedActiveId : presets[0]?.id ?? null,
  };
}

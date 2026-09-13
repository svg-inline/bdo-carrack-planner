import { CARRACKS, MATERIALS, MATERIAL_BY_ID } from "@/lib/data";
import type { CarrackTarget, GearState, MaterialDefinition, MaterialId, PlannerProfile } from "@/types";

// Materiais consumidos para chegar até a Carraca. O conjunto de Shiro é equipamento posterior
// e tem progresso próprio, por isso fica fora dos gargalos e do percentual da rota.
export function isCarrackBuildMaterial(material: MaterialDefinition) {
  return material.category === "blue-gear" || material.category === "carrack";
}

function gearScore(gear: GearState) {
  const base = Math.min(1, gear.baseEnhancement / 10);
  const crafted = gear.crafted ? 1 : 0;
  const blue = gear.crafted ? Math.min(1, gear.blueEnhancement / 10) : 0;
  return base * 0.25 + crafted * 0.25 + blue * 0.5;
}

export function getRequired(id: MaterialId, target: CarrackTarget) {
  return MATERIAL_BY_ID[id].required[target];
}

export function getMissing(profile: PlannerProfile, id: MaterialId) {
  return Math.max(0, getRequired(id, profile.target) - (profile.materials[id] || 0));
}

export function materialCompletion(profile: PlannerProfile, id: MaterialId) {
  const required = getRequired(id, profile.target);
  if (!required) return 1;
  return Math.min(1, (profile.materials[id] || 0) / required);
}

export function overallCompletion(profile: PlannerProfile) {
  const relevant = MATERIALS.filter((m) => isCarrackBuildMaterial(m) && m.required[profile.target] > 0);
  const materialScore = relevant.length ? relevant.reduce((sum, m) => sum + materialCompletion(profile, m.id), 0) / relevant.length : 0;
  const branch = CARRACKS[profile.target].branch;
  const branchGearScore = Object.values(profile.gear[branch]).reduce((sum, gear) => sum + gearScore(gear), 0) / 4;
  return Math.round((materialScore * 0.68 + branchGearScore * 0.32) * 100);
}

export function carrackGearCompletion(profile: PlannerProfile) {
  const pieces = Object.values(profile.carrackGear);
  return Math.round(pieces.reduce((sum, gear) => sum + gearScore(gear), 0) / pieces.length * 100);
}

export function bottlenecks(profile: PlannerProfile) {
  return MATERIALS.filter((m) => isCarrackBuildMaterial(m) && getMissing(profile, m.id) > 0)
    .map((m) => {
      const required = getRequired(m.id, profile.target);
      const missing = getMissing(profile, m.id);
      const missingRatio = required ? missing / required : 0;
      const crowBurden = m.crowPrice ? Math.min(1, (missing * m.crowPrice) / Math.max(1, profile.crowCoins || 1)) : 0.35;
      const recurringSourcePenalty = m.sources.some((s) => s.type === "daily" || s.type === "weekly") ? 0 : 10;
      const score = m.difficulty * 20 + missingRatio * 45 + crowBurden * 12 + recurringSourcePenalty;
      return { ...m, missing, required, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function purchasePlan(profile: PlannerProfile) {
  let remainingCoins = profile.crowCoins;
  const items = bottlenecks(profile)
    .filter((m) => m.crowPrice && m.crowPrice > 0)
    .map((m) => {
      const maxAffordable = Math.floor(remainingCoins / (m.crowPrice || 1));
      const suggested = Math.min(m.missing, maxAffordable);
      const cost = suggested * (m.crowPrice || 0);
      remainingCoins -= cost;
      return { id: m.id, name: m.name, suggested, cost, missing: m.missing, unit: m.crowPrice || 0, difficulty: m.difficulty };
    })
    .filter((x) => x.suggested > 0);
  return { items, remainingCoins };
}

export function questResetKey(cadence: "daily" | "weekly", now = new Date()) {
  if (cadence === "daily") return now.toISOString().slice(0, 10);
  const copy = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return `week-${copy.toISOString().slice(0, 10)}`;
}

export function nextActions(profile: PlannerProfile) {
  const hard = bottlenecks(profile).slice(0, 4);
  const actions: { title: string; detail: string; tone: "critical" | "gold" | "blue" }[] = [];

  hard.forEach((item, index) => {
    const bestSource = item.sources.find((s) => s.type === "weekly") || item.sources.find((s) => s.type === "daily") || item.sources.find((s) => s.type === "processing") || item.sources[0];
    actions.push({
      title: `${index + 1}. ${item.name}: faltam ${item.missing}`,
      detail: bestSource ? `Priorize ${bestSource.label}${bestSource.detail ? ` — ${bestSource.detail}` : ""}.` : "Priorize esta etapa.",
      tone: index === 0 ? "critical" : index === 1 ? "gold" : "blue",
    });
  });

  return actions.slice(0, 5);
}

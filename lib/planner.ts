import { CARRACKS, EXTRAVAGANT_CHEST, MATERIALS, MATERIAL_BY_ID, NORMAL_CHEST_STAGE_1, NORMAL_CHEST_STAGE_2 } from "@/lib/data";
import type { CarrackTarget, MaterialId, PlannerProfile } from "@/types";

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
  const relevant = MATERIALS.filter((m) => m.category !== "enhancement" && m.required[profile.target] > 0);
  const materialScore = relevant.length ? relevant.reduce((sum, m) => sum + materialCompletion(profile, m.id), 0) / relevant.length : 0;
  const branch = CARRACKS[profile.target].branch;
  const gearScore = Object.values(profile.gear[branch]).reduce((sum, gear) => {
    const base = Math.min(1, gear.baseEnhancement / 10);
    const crafted = gear.crafted ? 1 : 0;
    const blue = gear.crafted ? Math.min(1, gear.blueEnhancement / 10) : 0;
    return sum + (base * 0.25 + crafted * 0.25 + blue * 0.5);
  }, 0) / 4;
  return Math.round((materialScore * 0.68 + gearScore * 0.32) * 100);
}

export function bottlenecks(profile: PlannerProfile) {
  return MATERIALS.filter((m) => m.category !== "enhancement" && getMissing(profile, m.id) > 0)
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

function chestChoiceScore(profile: PlannerProfile, id: MaterialId, qty: number) {
  const material = MATERIAL_BY_ID[id];
  const required = getRequired(id, profile.target);
  const missing = getMissing(profile, id);
  if (!required || !missing) return -1000;
  const coverage = Math.min(1, qty / missing);
  const crowEquivalent = (material.crowPrice || 30) * Math.min(qty, missing);
  return material.difficulty * 100 + coverage * 55 + Math.log10(crowEquivalent + 10) * 18;
}

export function bestNormalChestChoices(profile: PlannerProfile) {
  const stage1 = [...NORMAL_CHEST_STAGE_1]
    .filter((x) => getMissing(profile, x.id) > 0)
    .map((x) => ({ ...x, score: chestChoiceScore(profile, x.id, x.qty), material: MATERIAL_BY_ID[x.id] }))
    .sort((a, b) => b.score - a.score);
  const stage2 = [...NORMAL_CHEST_STAGE_2]
    .filter((x) => getMissing(profile, x.id) > 0)
    .map((x) => ({ ...x, score: chestChoiceScore(profile, x.id, x.qty), material: MATERIAL_BY_ID[x.id] }))
    .sort((a, b) => b.score - a.score);
  return { stage1, stage2 };
}

export function bestExtravagantChoices(profile: PlannerProfile) {
  return [...EXTRAVAGANT_CHEST]
    .filter((x) => getMissing(profile, x.id) > 0)
    .map((x) => ({ ...x, score: chestChoiceScore(profile, x.id, x.qty), material: MATERIAL_BY_ID[x.id] }))
    .sort((a, b) => b.score - a.score);
}

export function questResetKey(cadence: "daily" | "weekly", now = new Date()) {
  if (cadence === "daily") return now.toISOString().slice(0, 10);
  const copy = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return `week-${copy.toISOString().slice(0, 10)}`;
}

export function nextActions(profile: PlannerProfile) {
  if (!profile.initialized) return [];
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

  if (profile.passOwned && (profile.normalChests > 0 || profile.extravagantChests > 0)) {
    actions.unshift({ title: "Passe: não abra os baús no automático", detail: "Use a aba Passe; o sistema cruza seu estoque com a Carraca escolhida.", tone: "gold" });
  }

  return actions.slice(0, 5);
}

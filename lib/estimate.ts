import { CARRACK_GEAR_SETS, GEAR_SETS, MATERIALS, MATERIAL_BY_ID } from "@/lib/data";
import { getMissing, isCarrackBuildMaterial } from "@/lib/planner";
import type { Acquisition, AcquisitionType, GearKey, MaterialDefinition, MaterialId, PlannerProfile, ShipBranch } from "@/types";

// O tempo estimado assume um jogador que conclui todas as missões diárias e semanais
// listadas para o material e ainda dedica o resto do dia às rotas livres do oceano.
// Missões têm quantidade e frequência conhecidas; permuta, caça, processamento e
// escavação dependem do tempo de jogo, então usam uma estimativa única por dificuldade.
const DAYS_PER_CADENCE: Record<"daily" | "weekly", number> = { daily: 1, weekly: 7 };

/** Unidades atribuídas a um dia de farm dedicado, por dificuldade do material. */
export const FARM_UNITS_PER_DAY: Record<MaterialDefinition["difficulty"], number> = { 1: 60, 2: 35, 3: 20, 4: 10, 5: 4 };

const FARM_TYPES: AcquisitionType[] = ["barter", "hunt", "processing", "workers", "market"];

function isQuestSource(source: Acquisition): source is Acquisition & { type: "daily" | "weekly"; yield: number } {
  return (source.type === "daily" || source.type === "weekly") && typeof source.yield === "number" && source.yield > 0;
}

function isFarmSource(source: Acquisition) {
  return FARM_TYPES.includes(source.type);
}

/**
 * Quantas metas pendentes disputam cada recompensa de escolha. Uma missão com escolha
 * entrega um item por conclusão, então o ritmo dela é dividido entre os materiais que
 * ainda faltam; conforme as metas são concluídas, os restantes recebem o ritmo cheio.
 */
export function choiceCompetitors(profile: PlannerProfile): Record<string, number> {
  const competitors: Record<string, number> = {};
  for (const material of MATERIALS) {
    if (getMissing(profile, material.id) <= 0) continue;
    for (const source of material.sources) {
      if (source.group && isQuestSource(source)) competitors[source.group] = (competitors[source.group] || 0) + 1;
    }
  }
  return competitors;
}

export interface CoinPurchase {
  id: MaterialId;
  name: string;
  /** Preço em Moeda Corvo por unidade. */
  unit: number;
  suggested: number;
  cost: number;
  missing: number;
  difficulty: MaterialDefinition["difficulty"];
  /** Dias de farm que a compra economiza neste material. */
  daysSaved: number;
}

export interface CoinPlan {
  items: CoinPurchase[];
  coverage: Partial<Record<MaterialId, number>>;
  remainingCoins: number;
}

/**
 * Distribui o saldo de Moeda Corvo onde ele corta mais tempo. A cada passo compra o
 * material que hoje define o prazo, só até ele alcançar o próximo da fila, e repete com
 * o que sobrar. Como o prazo depende do estoque, o plano é refeito inteiro sempre que o
 * inventário, o saldo ou a Carraca do preset mudam.
 */
export function coinPlan(profile: PlannerProfile, competitors = choiceCompetitors(profile)): CoinPlan {
  const candidates = MATERIALS
    .filter((material) => (material.crowPrice || 0) > 0 && getMissing(profile, material.id) > 0)
    .map((material) => ({
      material,
      price: material.crowPrice || 0,
      missing: getMissing(profile, material.id),
      perDay: materialRate(profile, material.id, competitors).perDay,
      bought: 0,
      order: 0,
    }));
  const daysLeft = (candidate: typeof candidates[number]) => daysForUnits(candidate.missing - candidate.bought, candidate.perDay);

  let remainingCoins = Math.max(0, Math.floor(profile.crowCoins));
  let order = 0;
  while (remainingCoins > 0) {
    const reducible = candidates.filter((candidate) => candidate.bought < candidate.missing && candidate.price <= remainingCoins);
    if (!reducible.length) break;

    const target = reducible.reduce((slowest, candidate) => (daysLeft(candidate) > daysLeft(slowest) ? candidate : slowest));
    const targetDays = daysLeft(target);
    // Comprar além do próximo prazo da fila não adianta: o gargalo passaria a ser o outro material.
    const nextDays = candidates.reduce((longest, candidate) => {
      const days = daysLeft(candidate);
      return candidate !== target && days < targetDays && days > longest ? days : longest;
    }, 0);
    const left = target.missing - target.bought;
    const toNextLevel = Number.isFinite(targetDays) && target.perDay > 0 ? Math.ceil((targetDays - nextDays) * target.perDay) : left;
    const affordable = Math.floor(remainingCoins / target.price);
    const units = Math.max(1, Math.min(left, affordable, Math.max(1, toNextLevel)));

    target.bought += units;
    remainingCoins -= units * target.price;
    if (!target.order) target.order = ++order;
  }

  const items = candidates
    .filter((candidate) => candidate.bought > 0)
    .sort((a, b) => a.order - b.order)
    .map((candidate) => ({
      id: candidate.material.id,
      name: candidate.material.name,
      unit: candidate.price,
      suggested: candidate.bought,
      cost: candidate.bought * candidate.price,
      missing: candidate.missing,
      difficulty: candidate.material.difficulty,
      daysSaved: daysForUnits(candidate.bought, candidate.perDay),
    }));
  const coverage = Object.fromEntries(items.map((item) => [item.id, item.suggested])) as Partial<Record<MaterialId, number>>;
  return { items, coverage, remainingCoins };
}

/** Tudo que depende do plano inteiro, calculado uma vez e reaproveitado nas estimativas. */
export interface EstimateContext {
  competitors: Record<string, number>;
  coverage: Partial<Record<MaterialId, number>>;
  plan: CoinPlan;
}

export function estimateContext(profile: PlannerProfile): EstimateContext {
  const competitors = choiceCompetitors(profile);
  const plan = coinPlan(profile, competitors);
  return { competitors, coverage: plan.coverage, plan };
}

/** Mesmo contexto, sem gastar moeda nenhuma: serve para mostrar o prazo antes da compra. */
export function contextWithoutCoins(context: EstimateContext): EstimateContext {
  return { competitors: context.competitors, coverage: {}, plan: { items: [], coverage: {}, remainingCoins: 0 } };
}

export interface QuestRate {
  label: string;
  type: AcquisitionType;
  perDay: number;
}

export interface MaterialRate {
  /** Ritmo total estimado, em unidades por dia. */
  perDay: number;
  /** Parte vinda de missões recorrentes. */
  questPerDay: number;
  /** Parte vinda de permuta, caça, processamento ou escavação. */
  farmPerDay: number;
  quests: QuestRate[];
}

/** Ritmo diário de uma missão recorrente, já descontada a disputa por recompensas de escolha. */
export function questRatePerDay(source: Acquisition, competitors: Record<string, number>) {
  if (!isQuestSource(source)) return 0;
  const share = source.group ? 1 / Math.max(1, competitors[source.group] || 1) : 1;
  return (source.yield * share) / DAYS_PER_CADENCE[source.type];
}

export function materialRate(profile: PlannerProfile, id: MaterialId, competitors = choiceCompetitors(profile)): MaterialRate {
  const material = MATERIAL_BY_ID[id];
  const quests = material.sources.filter(isQuestSource).map((source) => ({
    label: source.label,
    type: source.type,
    perDay: questRatePerDay(source, competitors),
  }));
  const questPerDay = quests.reduce((sum, quest) => sum + quest.perDay, 0);
  // Permuta, caça e processamento são alternativas do mesmo tempo de jogo: contam uma vez só.
  const farmPerDay = material.sources.some(isFarmSource) ? FARM_UNITS_PER_DAY[material.difficulty] : 0;
  return { perDay: questPerDay + farmPerDay, questPerDay, farmPerDay, quests };
}

export function daysForUnits(units: number, perDay: number) {
  if (units <= 0) return 0;
  return perDay > 0 ? units / perDay : Number.POSITIVE_INFINITY;
}

export interface MaterialEstimate {
  id: MaterialId;
  /** Unidades que faltam para a meta. */
  missing: number;
  /** Parte do que falta que as Moedas Corvo já compram. */
  covered: number;
  /** O que sobra para farmar depois da compra. */
  remaining: number;
  perDay: number;
  days: number;
}

/** Tempo para completar a meta do material no plano ativo. */
export function materialEstimate(profile: PlannerProfile, id: MaterialId, context = estimateContext(profile)): MaterialEstimate {
  const missing = getMissing(profile, id);
  const covered = Math.min(missing, context.coverage[id] || 0);
  const remaining = missing - covered;
  const { perDay } = materialRate(profile, id, context.competitors);
  return { id, missing, covered, remaining, perDay, days: daysForUnits(remaining, perDay) };
}

export interface PartEstimate {
  days: number;
  /** Material que define o prazo da peça. */
  slowest: MaterialId | null;
  /** Quantos materiais ainda faltam. */
  pending: number;
  /** Unidades que as Moedas Corvo já resolvem entre esses materiais. */
  covered: number;
}

/** Tempo para juntar os materiais de uma receita, considerando o estoque e o saldo atuais. */
export function recipeEstimate(profile: PlannerProfile, materials: Partial<Record<MaterialId, number>>, context = estimateContext(profile)): PartEstimate {
  const entries = Object.entries(materials) as [MaterialId, number][];
  let days = 0;
  let slowest: MaterialId | null = null;
  let pending = 0;
  let covered = 0;
  for (const [id, quantity] of entries) {
    const missing = Math.max(0, quantity - (profile.materials[id] || 0));
    if (missing <= 0) continue;
    pending += 1;
    const bought = Math.min(missing, context.coverage[id] || 0);
    covered += bought;
    const { perDay } = materialRate(profile, id, context.competitors);
    const materialDays = daysForUnits(missing - bought, perDay);
    if (materialDays > days) {
      days = materialDays;
      slowest = id;
    }
  }
  return { days, slowest, pending, covered };
}

/** Peça azul do Navio Mercante ou do Contratorpedeiro. Peça fabricada não consome mais materiais. */
export function gearEstimate(profile: PlannerProfile, branch: ShipBranch, key: GearKey, context = estimateContext(profile)): PartEstimate {
  if (profile.gear[branch][key].crafted) return { days: 0, slowest: null, pending: 0, covered: 0 };
  return recipeEstimate(profile, GEAR_SETS[branch][key].materials, context);
}

/** Peça do conjunto de Shiro da Carraca do plano ativo. */
export function carrackGearEstimate(profile: PlannerProfile, key: GearKey, context = estimateContext(profile)): PartEstimate {
  if (profile.carrackGear[key].crafted) return { days: 0, slowest: null, pending: 0, covered: 0 };
  return recipeEstimate(profile, CARRACK_GEAR_SETS[profile.target][key].materials, context);
}

function slowestOf(estimates: MaterialEstimate[]): PartEstimate {
  let days = 0;
  let slowest: MaterialId | null = null;
  let pending = 0;
  let covered = 0;
  for (const estimate of estimates) {
    if (estimate.missing <= 0) continue;
    pending += 1;
    covered += estimate.covered;
    if (estimate.days > days) {
      days = estimate.days;
      slowest = estimate.id;
    }
  }
  return { days, slowest, pending, covered };
}

/**
 * Tempo até a Carraca ficar construível: os materiais da rota são obtidos em paralelo,
 * então o prazo é o do material mais demorado. Fabricação e aprimoramento dependem de
 * tentativas e de sorte, e ficam fora da conta.
 */
export function shipEstimate(profile: PlannerProfile, context = estimateContext(profile)): PartEstimate {
  const route = MATERIALS.filter((material) => isCarrackBuildMaterial(material) && material.required[profile.target] > 0);
  return slowestOf(route.map((material) => materialEstimate(profile, material.id, context)));
}

/**
 * Tempo para juntar o conjunto de Shiro inteiro. As quatro peças pedem os mesmos
 * materiais, então o prazo do conjunto usa a meta somada, e não a de uma peça isolada.
 */
export function carrackGearSetEstimate(profile: PlannerProfile, context = estimateContext(profile)): PartEstimate {
  const set = MATERIALS.filter((material) => material.category === "carrack-gear" && material.required[profile.target] > 0);
  return slowestOf(set.map((material) => materialEstimate(profile, material.id, context)));
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Texto curto do prazo. Arredonda para cima para não prometer menos tempo do que o estimado. */
export function formatDuration(days: number) {
  if (days <= 0) return "pronto";
  if (!Number.isFinite(days)) return "sem estimativa";
  const total = Math.ceil(days);
  if (total === 1) return "1 dia";
  if (total < 14) return `${total} dias`;
  if (total < 70) return `${Math.ceil(total / 7)} semanas`;
  return `${Math.ceil(total / 30)} meses`;
}

/** Ritmo diário estimado, em unidades por dia. */
export function formatRate(perDay: number) {
  if (perDay <= 0) return "sem ritmo estimado";
  return `${decimal.format(perDay)}/dia`;
}

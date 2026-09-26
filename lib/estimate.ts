import { CADENCE_BY_ID, CARRACK_GEAR_SETS, CARRACK_PART_COUNT, CARRACK_PART_CROW_PRICE, GEAR_SETS, MATERIALS, MATERIAL_BY_ID, QUESTS, YELLOW_GEAR_SETS } from "@/lib/data";
import { getGoal, getMissing, isCarrackBuildMaterial } from "@/lib/planner";
import { activeQuestIds, isQuestAcquisition, questChoiceOf } from "@/lib/quests";
import type { Acquisition, AcquisitionType, CrowSpendPlan, FarmActivity, FarmRoutine, GearKey, MaterialCategory, MaterialDefinition, MaterialId, PlannerProfile, QuestAcquisition, QuestDefinition, ShipBranch } from "@/types";

// O tempo estimado assume um jogador que conclui em dia as missões que ele mesmo marcou
// como parte da rotina e ainda dedica o resto do dia às atividades livres do oceano que
// ele também marcou. Missões têm quantidade e frequência conhecidas; permuta, caça,
// processamento e escavação dependem do tempo de jogo, então usam uma estimativa única
// por dificuldade — e só quando o jogador diz que faz aquela atividade.

/** Unidades atribuídas a um dia de farm dedicado, por dificuldade do material. */
export const FARM_UNITS_PER_DAY: Record<MaterialDefinition["difficulty"], number> = { 1: 60, 2: 35, 3: 20, 4: 10, 5: 4 };

/**
 * Atividade da rotina que libera cada fonte sem frequência fixa. Processar depende do drop da
 * caça, então anda com ela. Mercado não tem interruptor e nenhum material do catálogo o usa.
 */
const FARM_ACTIVITY_OF: Partial<Record<AcquisitionType, FarmActivity>> = {
  barter: "barter",
  hunt: "hunt",
  processing: "hunt",
  workers: "workers",
};

function isQuestSource(source: Acquisition): source is QuestAcquisition {
  return isQuestAcquisition(source) && source.yield > 0;
}

/** A fonte é de farm e a atividade dela está na rotina do jogador. */
export function isRoutineFarmSource(source: Acquisition, routine: FarmRoutine) {
  const activity = FARM_ACTIVITY_OF[source.type];
  return activity !== undefined && routine[activity];
}

/**
 * Missões que entram na conta e a disputa por recompensas de escolha. Uma missão fora da
 * rotina do jogador não rende nada, e por isso também não disputa a escolha.
 */
export interface QuestContext {
  /** Missões marcadas no preset. */
  active: Set<string>;
  /** Quantas metas pendentes disputam cada recompensa de escolha. */
  competitors: Record<string, number>;
  /** Item que o jogador leva em cada missão de escolha, já descartadas as metas concluídas. */
  choices: Record<string, string>;
}

/**
 * Escolhas que o cálculo aplica de fato. Missão fora da rotina não entrega nada, e uma escolha
 * apontando para uma meta já concluída volta ao automático: presa a um item pronto, a missão
 * zeraria o ritmo das outras opções e o prazo apareceria sem estimativa, sem nada explicando.
 */
export function effectiveChoices(profile: PlannerProfile, active = activeQuestIds(profile)): Record<string, string> {
  const choices: Record<string, string> = {};
  for (const [questId, optionId] of Object.entries(profile.questChoices)) {
    if (!active.has(questId)) continue;
    const option = questChoiceOf(questId)?.options.find((candidate) => candidate.id === optionId);
    if (!option || (option.material && getMissing(profile, option.material) <= 0)) continue;
    choices[questId] = optionId;
  }
  return choices;
}

/**
 * Quantas metas pendentes disputam cada recompensa de escolha. Uma missão com escolha
 * entrega um item por conclusão, então o ritmo dela é dividido entre os materiais que
 * ainda faltam; conforme as metas são concluídas, os restantes recebem o ritmo cheio.
 */
export function choiceCompetitors(
  profile: PlannerProfile,
  active = activeQuestIds(profile),
  choices = effectiveChoices(profile, active),
): Record<string, number> {
  const competitors: Record<string, number> = {};
  for (const material of MATERIALS) {
    if (getMissing(profile, material.id) <= 0) continue;
    for (const source of material.sources) {
      if (!isQuestSource(source) || !source.group || !active.has(source.questId)) continue;
      // Missão com item escolhido não divide nada: ela entrega o item do jogador e mais nada.
      if (choices[source.questId]) continue;
      competitors[source.group] = (competitors[source.group] || 0) + 1;
    }
  }
  return competitors;
}

export function questContext(profile: PlannerProfile): QuestContext {
  const active = activeQuestIds(profile);
  const choices = effectiveChoices(profile, active);
  return { active, competitors: choiceCompetitors(profile, active, choices), choices };
}

export interface CoinPurchase {
  id: MaterialId;
  name: string;
  /** Preço em Moeda Corvo por unidade. */
  unit: number;
  /** Unidades que o plano compra, somando hoje e o que vem da moeda das missões. */
  suggested: number;
  cost: number;
  missing: number;
  difficulty: MaterialDefinition["difficulty"];
  /** Unidades que o saldo de hoje já paga. */
  now: number;
  /** Dias até a moeda acumulada pagar a compra inteira, contando tudo que vem antes na fila. */
  readyIn: number;
}

/** Reserva de saldo para as peças verdes de Toro, decidida antes de acelerar qualquer material. */
export interface CoinPartPurchase {
  /** Peças que o jogador pediu. */
  count: number;
  /** Peças que o saldo atual realmente paga. */
  affordable: number;
  /** Moedas separadas para elas. */
  cost: number;
  unit: number;
  /** Dias até a moeda das missões pagar todas as peças pedidas. */
  readyIn: number;
}

export interface CoinPlan {
  /** Fila de compra, na ordem em que a moeda paga cada item. */
  items: CoinPurchase[];
  coverage: Partial<Record<MaterialId, number>>;
  /** Dia em que a compra de cada material fica paga. */
  readyAt: Partial<Record<MaterialId, number>>;
  /** Saldo que sobra depois do que dá para comprar hoje. */
  remainingCoins: number;
  parts: CoinPartPurchase;
  /** Moeda Corvo por dia que as missões da rotina rendem. */
  income: number;
  /** Moedas que ainda faltam juntar para pagar a fila inteira. */
  shortfall: number;
}

/**
 * Categoria liberada pelo jogador para a compra que acelera o farm. Os conjuntos de Shiro e de
 * Falasi e a Pedra Negra da Onda não têm preço na loja, então nunca disputam o saldo.
 */
export function acceleratesCategory(spend: CrowSpendPlan, category: MaterialCategory) {
  if (category === "blue-gear") return spend.blueGear;
  if (category === "carrack") return spend.carrackMaterials;
  return false;
}

/** Moeda Corvo entregue por uma conclusão da missão, lida da própria recompensa. */
export function questCrowCoins(quest: QuestDefinition): number {
  return quest.rewards.reduce((sum, reward) => {
    const match = /^Moeda Corvo x(\d+)$/.exec(reward.trim());
    return match ? sum + Number(match[1]) : sum;
  }, 0);
}

/** Moeda Corvo por dia das missões da rotina, supondo que o jogador as conclui em dia. */
export function crowCoinsPerDay(quests: QuestContext): number {
  return QUESTS.reduce((sum, quest) => quests.active.has(quest.id)
    ? sum + questCrowCoins(quest) / CADENCE_BY_ID[quest.cadence].periodDays : sum, 0);
}

/** Dias para as missões renderem as moedas que faltam. */
function daysToEarn(missingCoins: number, income: number) {
  if (missingCoins <= 0) return 0;
  return income > 0 ? missingCoins / income : Number.POSITIVE_INFINITY;
}

/**
 * Peças de Toro que o saldo cobre. Elas saem do topo do saldo, e não do que sobra: o jogador
 * que decide comprá-las está dizendo que aquelas moedas já têm dono, mesmo que acelerar
 * material rendesse mais dias. Peça é decisão, não otimização.
 */
export function partPurchase(profile: PlannerProfile, income = 0): CoinPartPurchase {
  const spend = profile.crowSpend;
  const balance = Math.max(0, Math.floor(profile.crowCoins));
  const count = spend.carrackParts ? Math.min(CARRACK_PART_COUNT, Math.max(0, Math.floor(spend.carrackPartCount))) : 0;
  const affordable = Math.min(count, Math.floor(balance / CARRACK_PART_CROW_PRICE));
  return {
    count, affordable, cost: affordable * CARRACK_PART_CROW_PRICE, unit: CARRACK_PART_CROW_PRICE,
    readyIn: daysToEarn(count * CARRACK_PART_CROW_PRICE - balance, income),
  };
}

/**
 * Decide o que comprar com o saldo de hoje e com a Moeda Corvo que as missões da rotina ainda
 * vão render. O prazo da rota é o primeiro dia T em que a moeda acumulada paga tudo que as
 * outras fontes não entregam até T: o que falta de cada material, menos o ritmo dele vezes T,
 * vezes o preço. Material que só sai da loja entra inteiro; material que vem de missão entra
 * só com a diferença, e por isso a compra nunca antecipa o que a missão já vai trazer.
 *
 * A fila começa pelas peças de Toro, porque são decisão do jogador, segue pelo que só a loja
 * entrega, do mais barato de fechar ao mais caro, e termina nas diferenças. Cada item fica
 * pronto no dia em que a moeda acumulada paga ele e tudo que vem antes. Como o prazo depende do
 * estoque, o plano é refeito inteiro sempre que o inventário, o saldo, a rotina ou a Carraca mudam.
 */
export function coinPlan(profile: PlannerProfile, quests = questContext(profile)): CoinPlan {
  const income = crowCoinsPerDay(quests);
  const parts = partPurchase(profile, income);
  const balance = Math.max(0, Math.floor(profile.crowCoins));
  const partsTotal = parts.count * parts.unit;
  const route = MATERIALS
    .filter((material) => isCarrackBuildMaterial(material) && getMissing(profile, material.id) > 0)
    .map((material) => ({
      material,
      price: acceleratesCategory(profile.crowSpend, material.category) ? material.crowPrice || 0 : 0,
      missing: getMissing(profile, material.id),
      perDay: materialRate(profile, material.id, quests).perDay,
    }));
  const buyable = route.filter((candidate) => candidate.price > 0);

  // O que a loja não resolve impõe um prazo mínimo; comprar para terminar antes dele não adianta.
  const floor = route.reduce((longest, candidate) => {
    const days = candidate.price > 0 ? 0 : daysForUnits(candidate.missing, candidate.perDay);
    return Number.isFinite(days) && days > longest ? days : longest;
  }, 0);
  const costAt = (days: number) => buyable.reduce((sum, candidate) =>
    sum + candidate.price * Math.max(0, candidate.missing - candidate.perDay * days), 0);
  const fundsAt = (days: number) => balance - partsTotal + income * days;
  const enough = (days: number) => fundsAt(days) >= costAt(days) - 1e-6;
  // A partir daqui, só o que a loja entrega sozinha continua custando.
  const settled = buyable.reduce((longest, candidate) =>
    candidate.perDay > 0 ? Math.max(longest, candidate.missing / candidate.perDay) : longest, floor);

  let target: number;
  if (enough(floor)) target = floor;
  else if (enough(settled)) {
    let low = floor;
    let high = settled;
    for (let step = 0; step < 60; step += 1) {
      const middle = (low + high) / 2;
      if (enough(middle)) high = middle;
      else low = middle;
    }
    target = high;
  } else target = income > 0 ? settled + (costAt(settled) - fundsAt(settled)) / income : Number.POSITIVE_INFINITY;

  // Com renda, arredondar a diferença para cima custa uma fração de dia; sem renda, passaria do
  // saldo e deixaria a compra sem data, então arredonda para baixo.
  const round = income > 0 ? (units: number) => Math.ceil(units - 1e-6) : (units: number) => Math.floor(units + 1e-6);
  const queue = buyable
    .map((candidate) => {
      const units = candidate.perDay <= 0 ? candidate.missing
        : Number.isFinite(target) ? Math.min(candidate.missing, Math.max(0, round(candidate.missing - candidate.perDay * target))) : 0;
      return { ...candidate, units, cost: units * candidate.price };
    })
    .filter((candidate) => candidate.units > 0)
    .sort((a, b) => Number(a.perDay > 0) - Number(b.perDay > 0) || a.cost - b.cost);

  // Hoje o saldo paga as peças primeiro e o resto segue a fila; a sobra passa para o próximo
  // item que ela paga, porque tudo na fila vai ser comprado de qualquer jeito.
  let available = partsTotal <= balance ? balance - partsTotal : 0;
  let spent = partsTotal;
  const items: CoinPurchase[] = queue.map((candidate) => {
    const now = Math.min(candidate.units, Math.floor(available / candidate.price));
    available -= now * candidate.price;
    spent += candidate.cost;
    return {
      id: candidate.material.id,
      name: candidate.material.name,
      unit: candidate.price,
      suggested: candidate.units,
      cost: candidate.cost,
      missing: candidate.missing,
      difficulty: candidate.material.difficulty,
      now,
      readyIn: daysToEarn(spent - balance, income),
    };
  });
  const coverage = Object.fromEntries(items.map((item) => [item.id, item.suggested])) as Partial<Record<MaterialId, number>>;
  const readyAt = Object.fromEntries(items.map((item) => [item.id, item.readyIn])) as Partial<Record<MaterialId, number>>;
  const remainingCoins = partsTotal <= balance ? available : balance - parts.cost;
  return { items, coverage, readyAt, remainingCoins, parts, income, shortfall: Math.max(0, spent - balance) };
}

/** Tudo que depende do plano inteiro, calculado uma vez e reaproveitado nas estimativas. */
export interface EstimateContext {
  quests: QuestContext;
  coverage: Partial<Record<MaterialId, number>>;
  plan: CoinPlan;
}

export function estimateContext(profile: PlannerProfile): EstimateContext {
  const quests = questContext(profile);
  const plan = coinPlan(profile, quests);
  return { quests, coverage: plan.coverage, plan };
}

/** Mesmo contexto, sem gastar moeda nenhuma: serve para mostrar o prazo antes da compra. */
export function contextWithoutCoins(context: EstimateContext): EstimateContext {
  const parts = { count: 0, affordable: 0, cost: 0, unit: CARRACK_PART_CROW_PRICE, readyIn: 0 };
  return {
    quests: context.quests,
    coverage: {},
    plan: { items: [], coverage: {}, readyAt: {}, remainingCoins: 0, parts, income: context.plan.income, shortfall: 0 },
  };
}

/** Dia em que o material fica completo: pelo ritmo das fontes ou pela compra, o que vier depois. */
function completionDays(missing: number, bought: number, perDay: number, readyAt: number | undefined) {
  const byRate = daysForUnits(missing - bought, perDay);
  return bought > 0 ? Math.max(byRate, readyAt ?? 0) : byRate;
}

export interface QuestRate {
  label: string;
  type: AcquisitionType;
  questId: string;
  /** A missão está na rotina escolhida pelo preset. */
  active: boolean;
  perDay: number;
}

export interface MaterialRate {
  /** Ritmo total estimado, em unidades por dia. */
  perDay: number;
  /** Parte vinda de missões recorrentes. */
  questPerDay: number;
  /** Parte vinda de permuta, caça, processamento ou escavação. */
  farmPerDay: number;
  /** A parte de farm é a média informada pelo jogador, e não a estimativa por dificuldade. */
  customFarm: boolean;
  quests: QuestRate[];
}

/**
 * Ritmo diário de uma missão recorrente, já descontada a disputa por recompensas de escolha.
 * Missão fora da rotina escolhida pelo jogador não rende nada.
 */
export function questRatePerDay(source: Acquisition, quests: QuestContext, materialId: MaterialId) {
  if (!isQuestSource(source) || !quests.active.has(source.questId)) return 0;
  const chosen = source.group ? quests.choices[source.questId] : undefined;
  // Com o item escolhido, a conclusão inteira vai para ele; as outras opções não saem da missão.
  const share = chosen ? (chosen === materialId ? 1 : 0)
    : source.group ? 1 / Math.max(1, quests.competitors[source.group] || 1) : 1;
  return (source.yield * share) / CADENCE_BY_ID[source.type].periodDays;
}

/** Estimativa do planner para o farm do material, sem a média informada pelo jogador. */
export function estimatedFarmPerDay(profile: PlannerProfile, id: MaterialId) {
  const material = MATERIAL_BY_ID[id];
  return material.sources.some((source) => isRoutineFarmSource(source, profile.farmRoutine))
    ? FARM_UNITS_PER_DAY[material.difficulty] : 0;
}

export function materialRate(profile: PlannerProfile, id: MaterialId, quests = questContext(profile)): MaterialRate {
  const material = MATERIAL_BY_ID[id];
  const sources = material.sources.filter(isQuestSource).map((source) => ({
    label: source.label,
    type: source.type,
    questId: source.questId,
    active: quests.active.has(source.questId),
    perDay: questRatePerDay(source, quests, id),
  }));
  const questPerDay = sources.reduce((sum, quest) => sum + quest.perDay, 0);
  // Permuta, caça e processamento são alternativas do mesmo tempo de jogo: contam uma vez só,
  // e nenhuma vez quando o jogador não faz nenhuma delas. A média que o jogador informa vale
  // mais que qualquer estimativa, inclusive a rotina: quem diz que dropa 5 por dia está
  // dizendo que faz a atividade.
  const custom = profile.farmRates[id];
  const farmPerDay = custom !== undefined ? custom : estimatedFarmPerDay(profile, id);
  return { perDay: questPerDay + farmPerDay, questPerDay, farmPerDay, customFarm: custom !== undefined, quests: sources };
}

export function daysForUnits(units: number, perDay: number) {
  if (units <= 0) return 0;
  return perDay > 0 ? units / perDay : Number.POSITIVE_INFINITY;
}

/**
 * Opção que o planner sugere numa recompensa de escolha: entre as metas que ainda faltam, a
 * que hoje demora mais para ficar pronta sem esta missão. Medir o prazo sem a própria missão é
 * de propósito — a sugestão não pode mudar de lugar só porque o jogador aceitou a anterior.
 */
export function recommendedChoiceOption(profile: PlannerProfile, questId: string, quests = questContext(profile)): string | null {
  const choice = questChoiceOf(questId);
  if (!choice) return null;

  let recommended: string | null = null;
  let longest = -1;
  let deepest = 0;
  for (const option of choice.options) {
    if (!option.material) continue;
    const missing = getMissing(profile, option.material);
    if (missing <= 0) continue;
    const rate = materialRate(profile, option.material, quests);
    const withoutQuest = rate.quests.reduce((sum, quest) => quest.questId === questId ? sum - quest.perDay : sum, rate.perDay);
    const days = daysForUnits(missing, withoutQuest);
    // Empate entre metas sem ritmo nenhum: vence a que exige mais conclusões desta missão.
    const completions = missing / Math.max(1, option.quantity);
    if (days > longest || (days === longest && completions > deepest)) {
      recommended = option.id;
      longest = days;
      deepest = completions;
    }
  }
  return recommended;
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
  const { perDay } = materialRate(profile, id, context.quests);
  return { id, missing, covered, remaining, perDay, days: completionDays(missing, covered, perDay, context.plan.readyAt[id]) };
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
    const { perDay } = materialRate(profile, id, context.quests);
    const materialDays = completionDays(missing, bought, perDay, context.plan.readyAt[id]);
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

/** Material da rota que nem as fontes da rotina nem a Moeda Corvo conseguem fechar. */
export interface StalledMaterial {
  id: MaterialId;
  /** Unidades que o saldo de hoje não paga. */
  remaining: number;
  /** Moedas para comprar esse resto na loja. */
  cost: number;
}

/**
 * Materiais que deixam a rota sem prazo: nenhuma fonte na rotina e nenhum jeito de pagar a
 * compra — a categoria não está liberada para a moeda, ou nenhuma missão marcada rende Moeda
 * Corvo e o saldo de hoje não chega. O planner diz quais são em vez de mostrar um prazo vazio.
 */
export function stalledRoute(profile: PlannerProfile, context = estimateContext(profile)): StalledMaterial[] {
  return MATERIALS
    .filter((material) => isCarrackBuildMaterial(material) && material.required[profile.target] > 0)
    .map((material) => materialEstimate(profile, material.id, context))
    .filter((estimate) => estimate.missing > 0 && !Number.isFinite(estimate.days))
    .map((estimate) => {
      const paidToday = context.plan.items.find((item) => item.id === estimate.id)?.now ?? 0;
      const remaining = estimate.missing - paidToday;
      return { id: estimate.id, remaining, cost: remaining * (MATERIAL_BY_ID[estimate.id].crowPrice || 0) };
    });
}

/**
 * Tempo para juntar os materiais de uma categoria do inventário. Como os materiais são
 * obtidos em paralelo, o prazo da categoria é o do material mais demorado dela.
 */
export function categoryEstimate(profile: PlannerProfile, category: MaterialCategory, context = estimateContext(profile)): PartEstimate {
  const group = MATERIALS.filter((material) => material.category === category && getGoal(profile, material.id) > 0);
  return slowestOf(group.map((material) => materialEstimate(profile, material.id, context)));
}

/** Peça amarela de Falasi da Carraca do plano ativo. */
export function yellowGearEstimate(profile: PlannerProfile, key: GearKey, context = estimateContext(profile)): PartEstimate {
  if (profile.yellowGear.crafted[key]) return { days: 0, slowest: null, pending: 0, covered: 0 };
  return recipeEstimate(profile, YELLOW_GEAR_SETS[profile.target][key].materials, context);
}

/**
 * Tempo para juntar o conjunto de Shiro inteiro. As quatro peças pedem os mesmos
 * materiais, então o prazo do conjunto usa a meta somada, e não a de uma peça isolada.
 */
export function carrackGearSetEstimate(profile: PlannerProfile, context = estimateContext(profile)): PartEstimate {
  return categoryEstimate(profile, "carrack-gear", context);
}

/**
 * Tempo para juntar o conjunto de Falasi inteiro, pela mesma regra do conjunto de Shiro. Fora do
 * cálculo não há meta, e o prazo é zero: quem mostra o prazo deve checar `yellowGear.included`.
 */
export function yellowGearSetEstimate(profile: PlannerProfile, context = estimateContext(profile)): PartEstimate {
  return categoryEstimate(profile, "yellow-gear", context);
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

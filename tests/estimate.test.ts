import { describe, expect, it } from "vitest";
import { CARRACK_GEAR_SETS, CARRACK_PART_COUNT, CARRACK_PART_CROW_PRICE, GEAR_SETS, MATERIALS, MATERIAL_BY_ID, QUESTS } from "@/lib/data";
import { createInitialProfile } from "@/lib/profile";
import { isCarrackBuildMaterial } from "@/lib/planner";
import { setQuestActive, setQuestChoice } from "@/lib/quests";
import {
  carrackGearEstimate, carrackGearSetEstimate, categoryEstimate, choiceCompetitors, coinPlan, contextWithoutCoins, crowCoinsPerDay, daysForUnits,
  effectiveChoices, estimateContext, estimatedFarmPerDay, FARM_UNITS_PER_DAY, formatDuration, formatRate, gearEstimate, materialEstimate, materialRate,
  partPurchase, questContext, questCrowCoins, questRatePerDay, recommendedChoiceOption, shipEstimate, stalledRoute,
  yellowGearEstimate, yellowGearSetEstimate,
} from "@/lib/estimate";
import type { MaterialId, PlannerProfile } from "@/types";

/**
 * Tira da rotina as missões que rendem Moeda Corvo, para testar o plano só com o saldo de hoje.
 * As outras recompensas delas também saem, e é por isso que o ajuste fica restrito a estes testes.
 */
function soSaldo(profile: PlannerProfile) {
  for (const quest of QUESTS) if (questCrowCoins(quest) > 0) profile.activeQuests[quest.id] = false;
  return profile;
}

describe("ritmo de obtenção", () => {
  it("soma as missões recorrentes com a estimativa de farm do material", () => {
    const profile = createInitialProfile("bravura");
    const rate = materialRate(profile, "enhancedPlywood");

    // Ilha de Iliya Agitada entrega 10 por dia de recompensa fixa; caça e permuta
    // valem um dia de farm de dificuldade 3.
    expect(rate.questPerDay).toBeCloseTo(10);
    expect(rate.farmPerDay).toBe(FARM_UNITS_PER_DAY[3]);
    expect(rate.perDay).toBeCloseTo(10 + FARM_UNITS_PER_DAY[3]);
    expect(formatRate(rate.perDay)).toBe("30/dia");
  });

  it("converte missão semanal em ritmo diário", () => {
    const otters = MATERIAL_BY_ID.seaweedStalk.sources.find((source) => source.type === "weekly");

    expect(questRatePerDay(otters!, questContext(createInitialProfile("bravura")), "seaweedStalk")).toBeCloseTo(45 / 7);
  });

  it("divide a recompensa de escolha entre as metas que ainda faltam", () => {
    const profile = createInitialProfile("bravura");
    const disputed = choiceCompetitors(profile)["semanal-cacador-de-kandidum"];
    const shared = materialRate(profile, "redSeaGold");

    expect(disputed).toBeGreaterThan(1);
    // Lontras entrega 15 fixos por semana; a semanal do Kandidum divide a conclusão entre as metas.
    expect(shared.questPerDay).toBeCloseTo(15 / 7 + (4 / disputed) / 7);

    // Com as outras metas da mesma escolha concluídas, a missão passa a render tudo para este material.
    const alone = createInitialProfile("bravura");
    for (const material of MATERIALS) {
      if (material.id !== "redSeaGold") alone.materials[material.id] = material.required.bravura;
    }
    expect(materialRate(alone, "redSeaGold").questPerDay).toBeCloseTo(15 / 7 + 4 / 7);
  });

  it("só conta as missões que o preset mantém na rotina", () => {
    const profile = createInitialProfile("bravura");
    const comReiDoMar = materialRate(profile, "abyssalEye");

    // A diária do Rei do Mar Jovem entrega Olho Abissal x1 e é a trilha padrão do Ravikel.
    expect(comReiDoMar.quests.find((quest) => quest.questId === "daily-okilua-young-sea-king")).toMatchObject({ active: true, perDay: 1 });

    profile.activeQuests = setQuestActive(profile.activeQuests, "daily-okilua-kandidum", true);
    const semReiDoMar = materialRate(profile, "abyssalEye");

    expect(semReiDoMar.quests.find((quest) => quest.questId === "daily-okilua-young-sea-king")).toMatchObject({ active: false, perDay: 0 });
    expect(semReiDoMar.questPerDay).toBeCloseTo(comReiDoMar.questPerDay - 1);
    // A troca de trilha devolve ritmo aos materiais das três caçadas da Guilda.
    expect(materialRate(profile, "waveAdhesive").questPerDay).toBeGreaterThan(materialRate(createInitialProfile("bravura"), "waveAdhesive").questPerDay);
  });

  it("tira a missão desligada da disputa pela recompensa de escolha", () => {
    const profile = createInitialProfile("bravura");
    const disputado = choiceCompetitors(profile)["diario-preciso-proteger-pelo-menos-o-meu-corpo"];
    profile.activeQuests = setQuestActive(profile.activeQuests, "daily-okilua-protect-body", false);

    expect(disputado).toBeGreaterThan(0);
    expect(choiceCompetitors(profile)["diario-preciso-proteger-pelo-menos-o-meu-corpo"]).toBeUndefined();
    expect(questContext(profile).active.has("daily-okilua-protect-body")).toBe(false);
  });

  it("adia o prazo da rota quando o jogador abre mão de uma missão", () => {
    const profile = createInitialProfile("bravura");
    const antes = shipEstimate(profile).days;
    profile.activeQuests = setQuestActive(profile.activeQuests, "weekly-okilua-population", false);

    expect(shipEstimate(profile).days).toBeGreaterThan(antes);
  });

  it("não inventa ritmo para quem só tem Moeda Corvo como fonte", () => {
    expect(daysForUnits(10, 0)).toBe(Number.POSITIVE_INFINITY);
    expect(daysForUnits(0, 0)).toBe(0);
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("sem estimativa");
  });
});

describe("prazo por material", () => {
  it("usa o que falta, não a meta cheia", () => {
    const profile = createInitialProfile("bravura");
    const full = materialEstimate(profile, "enhancedPlywood");
    profile.materials.enhancedPlywood = 150;
    const half = materialEstimate(profile, "enhancedPlywood");

    const perDay = materialRate(profile, "enhancedPlywood").perDay;
    expect(full.days).toBeCloseTo(300 / perDay);
    expect(half.days).toBeCloseTo(150 / perDay);
    expect(half.days).toBeLessThan(full.days);
  });

  it("zera o prazo quando a meta está completa", () => {
    const profile = createInitialProfile("bravura");
    profile.materials.enhancedPlywood = 300;

    expect(materialEstimate(profile, "enhancedPlywood").days).toBe(0);
    expect(formatDuration(0)).toBe("pronto");
  });

  it("mantém uma estimativa finita para todo material exigido pelo plano", () => {
    const profile = createInitialProfile("gradual");
    const required = MATERIALS.filter((material) => material.required.gradual > 0);

    expect(required.length).toBeGreaterThan(0);
    for (const material of required) {
      expect(Number.isFinite(materialEstimate(profile, material.id).days), material.id).toBe(true);
    }
  });
});

describe("prazo por peça e por navio", () => {
  it("a peça leva o tempo do material mais demorado da própria receita", () => {
    const profile = createInitialProfile("bravura");
    const estimate = gearEstimate(profile, "galleass", "figurehead");
    const recipe = Object.entries(GEAR_SETS.galleass.figurehead.materials) as [MaterialId, number][];
    const slowest = Math.max(...recipe.map(([id, quantity]) => daysForUnits(quantity, materialRate(profile, id).perDay)));

    expect(estimate.pending).toBe(recipe.length);
    expect(estimate.days).toBeCloseTo(slowest);
    expect(recipe.map(([id]) => id)).toContain(estimate.slowest);
    // A receita pede 300 de madeira compensada, no ritmo estimado do próprio material.
    expect(estimate.slowest).toBe("enhancedPlywood");
    expect(estimate.days).toBeCloseTo(300 / materialRate(profile, "enhancedPlywood").perDay);
  });

  it("ignora os materiais da peça já fabricada", () => {
    const profile = createInitialProfile("bravura");
    profile.gear.galleass.cannon.crafted = true;
    profile.carrackGear.sail.crafted = true;

    expect(gearEstimate(profile, "galleass", "cannon")).toEqual({ days: 0, slowest: null, pending: 0, covered: 0 });
    expect(carrackGearEstimate(profile, "sail")).toEqual({ days: 0, slowest: null, pending: 0, covered: 0 });
  });

  it("a peça de Shiro conta apenas a própria receita", () => {
    const profile = createInitialProfile("bravura");
    const estimate = carrackGearEstimate(profile, "cannon");
    const recipe = Object.keys(CARRACK_GEAR_SETS.bravura.cannon.materials) as MaterialId[];

    expect(estimate.pending).toBe(recipe.length);
    expect(recipe).toContain(estimate.slowest);
  });

  it("o navio usa a meta somada da rota e nunca fica abaixo de uma peça", () => {
    const profile = createInitialProfile("bravura");
    const ship = shipEstimate(profile);
    const route = MATERIALS.filter((material) => isCarrackBuildMaterial(material) && material.required.bravura > 0);
    const slowest = Math.max(...route.map((material) => materialEstimate(profile, material.id).days));

    expect(ship.days).toBeCloseTo(slowest);
    expect(ship.pending).toBe(route.length);
    expect(ship.days).toBeGreaterThanOrEqual(gearEstimate(profile, "galleass", "sail").days);
  });

  it("o conjunto de Shiro inteiro demora mais do que uma peça sozinha", () => {
    const profile = createInitialProfile("bravura");

    expect(carrackGearSetEstimate(profile).days).toBeGreaterThan(carrackGearEstimate(profile, "cannon").days);
  });

  it("a categoria usa só os próprios materiais e nunca passa do prazo da rota inteira", () => {
    const profile = createInitialProfile("bravura");
    const carrack = categoryEstimate(profile, "carrack");
    const group = MATERIALS.filter((material) => material.category === "carrack" && material.required.bravura > 0);

    expect(carrack.days).toBeCloseTo(Math.max(...group.map((material) => materialEstimate(profile, material.id).days)));
    expect(carrack.pending).toBe(group.length);
    expect(carrack.days).toBeLessThanOrEqual(shipEstimate(profile).days);
    // O conjunto de Shiro é exatamente a categoria de equipamento da Carraca.
    expect(categoryEstimate(profile, "carrack-gear")).toEqual(carrackGearSetEstimate(profile));
  });

  it("a categoria fica pronta quando os materiais dela já estão no inventário", () => {
    const profile = createInitialProfile("bravura");
    for (const material of MATERIALS) if (material.category === "carrack") profile.materials[material.id] = material.required.bravura;

    expect(categoryEstimate(profile, "carrack").days).toBe(0);
    expect(categoryEstimate(profile, "blue-gear").days).toBeGreaterThan(0);
  });

  it("o progresso do inventário encurta o prazo do navio", () => {
    const profile = createInitialProfile("bravura");
    const before = shipEstimate(profile).days;
    profile.materials.coxCombat = MATERIAL_BY_ID.coxCombat.required.bravura;

    expect(shipEstimate(profile).days).toBeLessThan(before);
  });

  it("chega a zero quando a rota inteira está no inventário", () => {
    const profile = createInitialProfile("bravura");
    for (const material of MATERIALS) profile.materials[material.id] = material.required.bravura;

    expect(shipEstimate(profile)).toEqual({ days: 0, slowest: null, pending: 0, covered: 0 });
  });
});

describe("Moeda Corvo no prazo", () => {
  it("gasta primeiro no material que segura o prazo da rota", () => {
    const profile = soSaldo(createInitialProfile("bravura"));
    const semMoedas = shipEstimate(profile);
    profile.crowCoins = 1_200; // 10 unidades do Artefato Cox(Combate).
    const plano = coinPlan(profile);

    // O Artefato Cox(Combate) é o material mais demorado da Bravura, então leva o saldo inteiro.
    expect(semMoedas.slowest).toBe("coxCombat");
    expect(plano.items).toHaveLength(1);
    expect(plano.items[0]).toMatchObject({ id: "coxCombat", suggested: 10, cost: 1_200 });
    expect(plano.remainingCoins).toBe(0);
    expect(materialEstimate(profile, "coxCombat").remaining).toBe(MATERIAL_BY_ID.coxCombat.required.bravura - 10);
  });

  it("para de comprar quando o material alcança o próximo da fila", () => {
    const profile = soSaldo(createInitialProfile("bravura"));
    profile.crowCoins = 60_000;
    const plano = coinPlan(profile);
    const context = estimateContext(profile);
    const comprado = plano.coverage.coxCombat ?? 0;

    expect(comprado).toBeGreaterThan(0);
    expect(comprado).toBeLessThan(materialEstimate(profile, "coxCombat").missing);
    expect(plano.items.length).toBeGreaterThan(1);
    // Nenhum material comprado fica mais rápido do que o prazo geral que sobrou.
    for (const item of plano.items) {
      expect(materialEstimate(profile, item.id, context).days).toBeLessThanOrEqual(shipEstimate(profile, context).days + 1e-9);
    }
  });

  it("refaz o plano inteiro quando o estoque muda", () => {
    const profile = soSaldo(createInitialProfile("bravura"));
    profile.crowCoins = 1_200;
    expect(coinPlan(profile).items[0].id).toBe("coxCombat");

    profile.materials.coxCombat = 250;
    const depois = coinPlan(profile);

    expect(depois.coverage.coxCombat).toBeUndefined();
    expect(depois.items[0].id).toBe(shipEstimate(profile).slowest);
  });

  it("nunca compra mais do que falta nem gasta mais do que o saldo", () => {
    const profile = soSaldo(createInitialProfile("bravura"));
    profile.materials.coxCombat = 200;
    profile.crowCoins = 25_000;
    const plano = coinPlan(profile);
    const total = plano.items.reduce((sum, item) => sum + item.cost, 0);

    expect(total).toBeLessThanOrEqual(profile.crowCoins);
    expect(plano.remainingCoins).toBe(profile.crowCoins - total);
    for (const item of plano.items) {
      expect(item.suggested).toBeLessThanOrEqual(item.missing);
      expect(item.cost).toBe(item.suggested * item.unit);
    }
  });

  it("ignora o saldo para quem não está na loja de Moeda Corvo", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 1_000_000;

    expect(materialEstimate(profile, "violentWavePlywood").covered).toBe(0);
    expect(coinPlan(profile).coverage.shiroCannonBlueprint).toBeUndefined();
  });

  it("encurta o prazo do navio conforme o saldo cresce", () => {
    const profile = soSaldo(createInitialProfile("bravura"));
    const semMoedas = shipEstimate(profile);
    profile.crowCoins = 29_438;
    const parcial = shipEstimate(profile);
    profile.crowCoins = 300_000;
    const context = estimateContext(profile);

    expect(parcial.days).toBeLessThan(semMoedas.days);
    expect(parcial.covered).toBeGreaterThan(0);
    expect(shipEstimate(profile, context).days).toBe(0);
    expect(gearEstimate(profile, "galleass", "sail", context).days).toBe(0);
    expect(shipEstimate(profile, contextWithoutCoins(context)).days).toBeCloseTo(semMoedas.days);
  });
});

describe("renda de Moeda Corvo das missões", () => {
  it("lê a moeda de toda recompensa que a menciona", () => {
    for (const quest of QUESTS) {
      const mencionadas = quest.rewards.filter((reward) => reward.includes("Moeda Corvo"));
      if (mencionadas.length) expect(questCrowCoins(quest)).toBeGreaterThan(0);
      else expect(questCrowCoins(quest)).toBe(0);
    }
  });

  it("soma só as missões da rotina, com as semanais divididas pela semana", () => {
    const profile = createInitialProfile("bravura");
    const quests = questContext(profile);
    const esperado = QUESTS.filter((quest) => quests.active.has(quest.id))
      .reduce((sum, quest) => sum + questCrowCoins(quest) / (quest.cadence === "weekly" ? 7 : 1), 0);

    expect(crowCoinsPerDay(quests)).toBeCloseTo(esperado);
    expect(crowCoinsPerDay(questContext(soSaldo(profile)))).toBe(0);
  });
});

describe("texto dos prazos", () => {
  it("arredonda para cima e troca de unidade conforme o tamanho", () => {
    expect(formatDuration(0.2)).toBe("1 dia");
    expect(formatDuration(3.1)).toBe("4 dias");
    expect(formatDuration(13)).toBe("13 dias");
    expect(formatDuration(14)).toBe("2 semanas");
    expect(formatDuration(69)).toBe("10 semanas");
    expect(formatDuration(70)).toBe("3 meses");
  });

  it("descreve o ritmo em unidades por dia", () => {
    expect(formatRate(0)).toBe("sem ritmo estimado");
    expect(formatRate(2.25)).toBe("2,3/dia");
  });
});

describe("onde a Moeda Corvo pode ser gasta", () => {
  it("acelera as duas categorias e não reserva peça nenhuma por padrão", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 60_000;
    const plano = coinPlan(profile);

    expect(profile.crowSpend).toMatchObject({ blueGear: true, carrackMaterials: true, carrackParts: false });
    expect(plano.parts.cost).toBe(0);
    expect(plano.items.length).toBeGreaterThan(0);
  });

  it("deixa de gastar na categoria que o jogador desmarcou", () => {
    const profile = createInitialProfile("bravura");
    // Com o equipamento azul quase pronto, a Carraca é quem segura o prazo e tem o que comprar.
    for (const material of MATERIALS) {
      if (material.category === "blue-gear") profile.materials[material.id] = material.required.bravura;
    }
    profile.materials.coxCombat -= 1;
    profile.crowCoins = 60_000;
    profile.crowSpend.blueGear = false;
    const plano = coinPlan(profile);

    expect(plano.items.length).toBeGreaterThan(0);
    for (const item of plano.items) expect(MATERIAL_BY_ID[item.id].category).toBe("carrack");
    expect(plano.coverage.coxCombat).toBeUndefined();
  });

  it("não gasta nada quando nenhuma categoria está liberada", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 60_000;
    profile.crowSpend.blueGear = false;
    profile.crowSpend.carrackMaterials = false;
    const plano = coinPlan(profile);

    expect(plano.items).toEqual([]);
    expect(plano.remainingCoins).toBe(60_000);
    expect(materialEstimate(profile, "coxCombat").covered).toBe(0);
  });

  it("reserva as peças verdes antes de acelerar qualquer material", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 45_000;
    profile.crowSpend.carrackParts = true;
    const plano = coinPlan(profile);
    const gastoHoje = plano.items.reduce((sum, item) => sum + item.now * item.unit, 0);

    expect(plano.parts).toMatchObject({ count: CARRACK_PART_COUNT, affordable: CARRACK_PART_COUNT, readyIn: 0 });
    expect(plano.parts.cost).toBe(CARRACK_PART_COUNT * CARRACK_PART_CROW_PRICE);
    // Hoje só sobram 5.000 para material; o resto da fila espera a moeda das missões.
    expect(gastoHoje).toBeLessThanOrEqual(5_000);
    expect(plano.remainingCoins).toBe(45_000 - plano.parts.cost - gastoHoje);
    for (const item of plano.items) expect(item.readyIn).toBeGreaterThanOrEqual(0);
  });

  it("compra só as peças que o saldo paga", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 25_000;
    profile.crowSpend.carrackParts = true;

    expect(partPurchase(profile)).toMatchObject({ count: 4, affordable: 2, cost: 20_000 });
  });

  it("comprar peça encurta o saldo que sobra para acelerar", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 50_000;
    const soAcelerando = coinPlan(profile).coverage;
    profile.crowSpend.carrackParts = true;
    const comPecas = coinPlan(profile).coverage;

    const antes = Object.values(soAcelerando).reduce((sum, units) => sum + (units ?? 0), 0);
    const depois = Object.values(comPecas).reduce((sum, units) => sum + (units ?? 0), 0);
    expect(depois).toBeLessThan(antes);
  });

  it("limita a quantidade de peças às quatro que a Carraca aceita", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 1_000_000;
    profile.crowSpend.carrackParts = true;
    profile.crowSpend.carrackPartCount = 99;

    expect(partPurchase(profile).count).toBe(CARRACK_PART_COUNT);
  });
});

describe("atividades de farm na rotina", () => {
  const soMissoes = { barter: false, hunt: false, workers: false };

  it("conta permuta, caça e escavação por padrão", () => {
    expect(createInitialProfile("bravura").farmRoutine).toEqual({ barter: true, hunt: true, workers: true });
  });

  it("tira o farm do ritmo quando o jogador só faz missões", () => {
    const profile = createInitialProfile("bravura");
    profile.farmRoutine = soMissoes;
    const rate = materialRate(profile, "enhancedPlywood");

    expect(rate.farmPerDay).toBe(0);
    expect(rate.perDay).toBeCloseTo(rate.questPerDay);
    // O Sal de Rocha não vem de missão nenhuma: sem farm, só a loja entrega, no dia em que
    // a moeda das missões pagar a compra.
    const context = estimateContext(profile);
    expect(materialRate(profile, "saltRock").perDay).toBe(0);
    expect(materialEstimate(profile, "saltRock", context).days).toBe(context.plan.readyAt.saltRock);
    expect(materialEstimate(profile, "saltRock", context).days).toBeGreaterThan(0);
  });

  it("conta a fonte só pela atividade marcada, e o processamento segue a caça", () => {
    const profile = createInitialProfile("bravura");
    profile.farmRoutine = { barter: false, hunt: true, workers: false };
    // A Madeira da Lua sai de Khan secado e de caça, além de permuta.
    expect(materialRate(profile, "moonScalePlywood").farmPerDay).toBe(FARM_UNITS_PER_DAY[4]);

    profile.farmRoutine = { barter: true, hunt: false, workers: false };
    expect(materialRate(profile, "moonScalePlywood").farmPerDay).toBe(FARM_UNITS_PER_DAY[4]);
    // Cristal de Pérola Brilhante sai de caça e permuta; sem as duas, não rende.
    profile.farmRoutine = { barter: false, hunt: false, workers: true };
    expect(materialRate(profile, "brilliantPearl").farmPerDay).toBe(0);
  });

  it("compra primeiro o que só sai da loja, começando pelo mais barato de fechar", () => {
    const profile = createInitialProfile("bravura");
    Object.assign(profile.materials, {
      coxCombat: 76, saltRock: 0, brilliantPearl: 2, luminousCobalt: 6, greatOceanIron: 3,
    });
    profile.crowCoins = 5_887;
    profile.farmRoutine = soMissoes;
    const plano = coinPlan(profile);

    // O Cobalto (24 × 400) é o sem-fonte mais barato de fechar, e o saldo de hoje paga 14.
    expect(plano.items[0]).toMatchObject({ id: "luminousCobalt", suggested: 24, now: 14 });
    // Tudo que só sai da loja vem antes das diferenças de quem também vem de missão.
    const primeiraDiferenca = plano.items.findIndex((item) => materialRate(profile, item.id).perDay > 0);
    for (const item of plano.items.slice(0, primeiraDiferenca)) expect(materialRate(profile, item.id).perDay).toBe(0);
    // O Artefato de Combate vem de missão: só a diferença que ela não cobre entra na compra.
    expect(plano.coverage.coxCombat ?? 0).toBeLessThan(materialEstimate(profile, "coxCombat").missing);
    // A fila fica paga em ordem: cada item depois do anterior.
    for (let index = 1; index < plano.items.length; index += 1) {
      expect(plano.items[index].readyIn).toBeGreaterThanOrEqual(plano.items[index - 1].readyIn);
    }
  });

  it("junta a Moeda Corvo das missões para comprar o que o saldo não paga", () => {
    const profile = createInitialProfile("bravura");
    profile.farmRoutine = soMissoes;
    const context = estimateContext(profile);
    const plano = context.plan;
    const ultimo = plano.items[plano.items.length - 1];

    expect(plano.income).toBeGreaterThan(0);
    expect(plano.shortfall).toBe(plano.items.reduce((sum, item) => sum + item.cost, 0));
    expect(ultimo.readyIn).toBeCloseTo(plano.shortfall / plano.income);
    expect(stalledRoute(profile, context)).toEqual([]);
    expect(Number.isFinite(shipEstimate(profile, context).days)).toBe(true);
    expect(shipEstimate(profile, context).days).toBeGreaterThanOrEqual(ultimo.readyIn - 1e-9);
  });

  it("aponta os materiais sem fonte que o saldo não fecha e quanto custam", () => {
    const profile = soSaldo(createInitialProfile("bravura"));
    profile.farmRoutine = soMissoes;
    const context = estimateContext(profile);
    const parados = stalledRoute(profile, context);

    expect(shipEstimate(profile, context).days).toBe(Number.POSITIVE_INFINITY);
    expect(parados.map((material) => material.id)).toContain("saltRock");
    const sal = parados.find((material) => material.id === "saltRock")!;
    expect(sal.cost).toBe(sal.remaining * MATERIAL_BY_ID.saltRock.crowPrice!);

    // Saldo suficiente fecha tudo que só a loja entrega e devolve um prazo à rota.
    profile.crowCoins = 1_000_000;
    const comSaldo = estimateContext(profile);
    expect(stalledRoute(profile, comSaldo)).toEqual([]);
    expect(Number.isFinite(shipEstimate(profile, comSaldo).days)).toBe(true);
  });
});

describe("item escolhido na recompensa de escolha", () => {
  const CHARITY = "daily-okilua-charity";
  const rateOf = (profile: ReturnType<typeof createInitialProfile>, id: MaterialId, questId = CHARITY) =>
    materialRate(profile, id).quests.find((quest) => quest.questId === questId)?.perDay;

  it("entrega a conclusão inteira ao item escolhido", () => {
    const profile = createInitialProfile("bravura");
    // Sem escolha, a diária do Soldado é dividida entre as duas metas que ela oferece.
    expect(rateOf(profile, "tideTimber")).toBeCloseTo(5 / 2);
    expect(rateOf(profile, "violentWavePlywood")).toBeCloseTo(1 / 2);

    profile.questChoices = setQuestChoice(profile.questChoices, CHARITY, "violentWavePlywood");

    expect(rateOf(profile, "violentWavePlywood")).toBe(1);
    expect(rateOf(profile, "tideTimber")).toBe(0);
    expect(choiceCompetitors(profile)["diario-a-guilda-nao-e-uma-instituicao-de-caridade"]).toBeUndefined();
  });

  it("guarda a escolha de um item que o plano não acompanha, sem mexer em meta nenhuma", () => {
    const ROUTE = "daily-okilua-route-monsters";
    const profile = createInitialProfile("bravura");
    profile.questChoices = setQuestChoice(profile.questChoices, ROUTE, "agua-fresca-cristalina-de-okilua");

    expect(questContext(profile).choices[ROUTE]).toBe("agua-fresca-cristalina-de-okilua");
    // As três águas do Hae-Ran estão fora do plano da Carraca: nenhuma meta recebe ritmo.
    for (const material of MATERIALS) {
      expect(rateOf(profile, material.id, ROUTE), material.id).toBeUndefined();
    }
  });

  it("volta ao automático quando a meta escolhida já está concluída", () => {
    const profile = createInitialProfile("bravura");
    profile.materials.violentWavePlywood = MATERIAL_BY_ID.violentWavePlywood.required.bravura;
    profile.questChoices = setQuestChoice(profile.questChoices, CHARITY, "violentWavePlywood");

    expect(effectiveChoices(profile)[CHARITY]).toBeUndefined();
    // Sem concorrente pendente, a missão passa a render tudo para a meta que falta.
    expect(rateOf(profile, "tideTimber")).toBe(5);
  });

  it("ignora a escolha de uma missão que o preset tirou da rotina", () => {
    const profile = createInitialProfile("bravura");
    profile.questChoices = setQuestChoice(profile.questChoices, "daily-okilua-kandidum", "waveStone");

    // A trilha padrão do Ravikel é o Rei do Mar Jovem, então a caçada da Guilda não rende nada.
    expect(effectiveChoices(profile)[CHARITY]).toBeUndefined();
    expect(rateOf(profile, "violentWavePlywood", "daily-okilua-kandidum")).toBe(0);
  });

  it("sugere a meta que demora mais sem esta missão, e não muda por causa da escolha feita", () => {
    const profile = createInitialProfile("bravura");
    expect(recommendedChoiceOption(profile, CHARITY)).toBe("violentWavePlywood");

    profile.questChoices = setQuestChoice(profile.questChoices, CHARITY, "tideTimber");
    expect(recommendedChoiceOption(profile, CHARITY)).toBe("violentWavePlywood");

    // Concluída a meta sugerida, a sugestão passa para a opção que ainda falta.
    profile.materials.violentWavePlywood = MATERIAL_BY_ID.violentWavePlywood.required.bravura;
    expect(recommendedChoiceOption(profile, CHARITY)).toBe("tideTimber");

    expect(recommendedChoiceOption(profile, "weekly-okilua-young-otters")).toBeNull();
  });
});

describe("prazo do equipamento amarelo", () => {
  it("só tem prazo quando entra na conta, e não mexe no prazo da Carraca", () => {
    const profile = createInitialProfile("bravura");
    const ship = shipEstimate(profile);
    expect(yellowGearSetEstimate(profile).days).toBe(0);

    profile.yellowGear.included = true;
    const set = yellowGearSetEstimate(profile);
    expect(set.days).toBeGreaterThan(0);
    expect(set).toEqual(categoryEstimate(profile, "yellow-gear"));
    expect(shipEstimate(profile)).toEqual(ship);
  });

  it("depende da caça no oceano, que traz os espólios do Lyngbakr", () => {
    const profile = createInitialProfile("bravura");
    profile.yellowGear.included = true;
    profile.farmRoutine.hunt = false;
    expect(yellowGearSetEstimate(profile).days).toBe(Number.POSITIVE_INFINITY);
  });

  it("zera o prazo da peça pronta e usa a receita de uma peça nas outras", () => {
    const profile = createInitialProfile("gradual");
    profile.yellowGear.crafted.figurehead = true;
    expect(yellowGearEstimate(profile, "figurehead").days).toBe(0);
    const sail = yellowGearEstimate(profile, "sail");
    expect(sail.slowest).toBe("solidCoralSupport");
    expect(sail.days).toBeCloseTo(daysForUnits(125, materialRate(profile, "solidCoralSupport").perDay));
  });
});

describe("média de drop informada pelo jogador", () => {
  it("substitui a estimativa por dificuldade e soma com as missões", () => {
    const profile = createInitialProfile("bravura");
    const before = materialRate(profile, "seaweedStalk");
    profile.farmRates.seaweedStalk = 2.5;
    const rate = materialRate(profile, "seaweedStalk");
    expect(rate.customFarm).toBe(true);
    expect(rate.farmPerDay).toBe(2.5);
    expect(rate.questPerDay).toBeCloseTo(before.questPerDay);
    expect(rate.perDay).toBeCloseTo(before.questPerDay + 2.5);
    expect(estimatedFarmPerDay(profile, "seaweedStalk")).toBe(before.farmPerDay);
  });

  it("vale mesmo com a atividade fora da rotina", () => {
    const profile = createInitialProfile("bravura");
    profile.farmRoutine = { barter: false, hunt: false, workers: false };
    expect(materialRate(profile, "luminousCobalt").farmPerDay).toBe(0);
    profile.farmRates.luminousCobalt = 1;
    expect(materialRate(profile, "luminousCobalt").farmPerDay).toBe(1);
  });

  it("zero diz que o jogador não consegue o item fora das missões", () => {
    const profile = soSaldo(createInitialProfile("bravura"));
    profile.farmRates.luminousCobalt = 0;
    expect(materialRate(profile, "luminousCobalt").perDay).toBe(0);
    expect(materialEstimate(profile, "luminousCobalt", contextWithoutCoins(estimateContext(profile))).days).toBe(Number.POSITIVE_INFINITY);
  });

  it("muda o prazo do material conforme a média", () => {
    const profile = createInitialProfile("bravura");
    profile.farmRates.luminousCobalt = 3;
    const slow = materialEstimate(profile, "luminousCobalt", contextWithoutCoins(estimateContext(profile))).days;
    profile.farmRates.luminousCobalt = 6;
    const fast = materialEstimate(profile, "luminousCobalt", contextWithoutCoins(estimateContext(profile))).days;
    expect(slow).toBeCloseTo(30 / 3);
    expect(fast).toBeCloseTo(30 / 6);
  });
});

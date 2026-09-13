import { describe, expect, it } from "vitest";
import { CARRACK_GEAR_SETS, GEAR_SETS, MATERIALS, MATERIAL_BY_ID } from "@/lib/data";
import { createInitialProfile } from "@/lib/profile";
import { isCarrackBuildMaterial } from "@/lib/planner";
import {
  carrackGearEstimate, carrackGearSetEstimate, choiceCompetitors, coinCoverage, daysForUnits, FARM_UNITS_PER_DAY,
  formatDuration, formatRate, gearEstimate, materialEstimate, materialRate, questRatePerDay, shipEstimate,
} from "@/lib/estimate";
import type { MaterialId } from "@/types";

describe("ritmo de obtenção", () => {
  it("soma as missões recorrentes com a estimativa de farm do material", () => {
    const profile = createInitialProfile("bravura");
    const rate = materialRate(profile, "enhancedPlywood");

    // Ilha de Iliya Agitada entrega 10 por dia; caça e permuta valem um dia de farm de dificuldade 3.
    expect(rate.questPerDay).toBe(10);
    expect(rate.farmPerDay).toBe(FARM_UNITS_PER_DAY[3]);
    expect(rate.perDay).toBe(10 + FARM_UNITS_PER_DAY[3]);
    expect(formatRate(rate.perDay)).toBe("30/dia");
  });

  it("converte missão semanal em ritmo diário", () => {
    const otters = MATERIAL_BY_ID.seaweedStalk.sources.find((source) => source.type === "weekly");

    expect(questRatePerDay(otters!, {})).toBeCloseTo(45 / 7);
  });

  it("divide a recompensa de escolha entre as metas que ainda faltam", () => {
    const profile = createInitialProfile("bravura");
    const disputed = choiceCompetitors(profile)["pequena-retribuicao"];
    const shared = materialRate(profile, "redSeaGold");

    expect(disputed).toBeGreaterThan(1);
    expect(shared.questPerDay).toBeCloseTo(15 / 7 + 4 / disputed + (4 / 7) / 2);

    // Com as outras metas da mesma escolha concluídas, a missão passa a render tudo para este material.
    const alone = createInitialProfile("bravura");
    for (const material of MATERIALS) {
      if (material.id !== "redSeaGold") alone.materials[material.id] = material.required.bravura;
    }
    expect(materialRate(alone, "redSeaGold").questPerDay).toBeCloseTo(15 / 7 + 4 + 4 / 7);
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

    expect(full.days).toBeCloseTo(300 / 30);
    expect(half.days).toBeCloseTo(150 / 30);
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
    // A receita pede 300 de madeira compensada e o ritmo estimado é de 30 por dia.
    expect(estimate.slowest).toBe("enhancedPlywood");
    expect(estimate.days).toBeCloseTo(10);
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
  it("desconta do farm o que o saldo compra agora", () => {
    const profile = createInitialProfile("bravura");
    const semMoedas = materialEstimate(profile, "luminousCobalt");
    profile.crowCoins = 12_000; // 30 unidades a 400 moedas cada.
    const comMoedas = materialEstimate(profile, "luminousCobalt");

    expect(semMoedas.covered).toBe(0);
    expect(semMoedas.days).toBeCloseTo(30 / FARM_UNITS_PER_DAY[5]);
    expect(coinCoverage(profile).luminousCobalt).toBe(30);
    expect(comMoedas.covered).toBe(30);
    expect(comMoedas.remaining).toBe(0);
    expect(comMoedas.days).toBe(0);
    expect(comMoedas.missing).toBe(30);
  });

  it("cobre só parte da meta quando o saldo não dá para tudo", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 4_000;
    const estimate = materialEstimate(profile, "luminousCobalt");

    expect(estimate.covered).toBe(10);
    expect(estimate.remaining).toBe(20);
    expect(estimate.days).toBeCloseTo(20 / FARM_UNITS_PER_DAY[5]);
  });

  it("ignora o saldo para quem não está na loja de Moeda Corvo", () => {
    const profile = createInitialProfile("bravura");
    profile.crowCoins = 1_000_000;

    expect(materialEstimate(profile, "violentWavePlywood").covered).toBe(0);
    expect(coinCoverage(profile).shiroCannonBlueprint).toBeUndefined();
  });

  it("encurta o prazo do navio e da peça conforme o saldo cresce", () => {
    const profile = createInitialProfile("bravura");
    const semMoedas = shipEstimate(profile);
    const velaSemMoedas = gearEstimate(profile, "galleass", "sail");
    profile.crowCoins = 300_000;
    const comMoedas = shipEstimate(profile);
    const velaComMoedas = gearEstimate(profile, "galleass", "sail");

    expect(comMoedas.covered).toBeGreaterThan(0);
    expect(comMoedas.days).toBeLessThan(semMoedas.days);
    expect(velaComMoedas.days).toBeLessThan(velaSemMoedas.days);
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

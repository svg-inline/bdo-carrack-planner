import { describe, expect, it } from "vitest";
import { CADENCE_BY_ID, MATERIAL_BY_ID, MATERIALS, QUESTS, QUEST_BY_ID, QUEST_CADENCES, QUEST_GROUPS, QUEST_GROUP_BY_ID } from "@/lib/data";
import { createInitialProfile } from "@/lib/profile";
import {
  activeTrackOf, defaultActiveQuests, defaultTrackOf, isQuestAcquisition, isQuestActive,
  normalizeActiveQuests, questCounts, questsOfGroup, setQuestActive, tracksOfGroup,
} from "@/lib/quests";

describe("current ocean quests", () => {
  it("keeps the complete daily and weekly catalog from the quest guide", () => {
    expect(QUESTS).toHaveLength(38);
    expect(QUESTS.filter((quest) => quest.cadence === "daily")).toHaveLength(27);
    expect(QUESTS.filter((quest) => quest.cadence === "weekly")).toHaveLength(11);
    expect(new Set(QUESTS.map((quest) => quest.id))).toHaveLength(QUESTS.length);
  });

  it("uses the consolidated Iliya quest and its current rewards", () => {
    const agitated = QUEST_BY_ID["daily-iliya-agitated"];

    expect(agitated?.title).toBe("[Permuta][Diário] Ilha de Iliya Agitada");
    expect(agitated?.objective).toBe("Fazer 15 permutas.");
    expect(agitated?.rewards).toEqual(expect.arrayContaining([
      "Madeira Compensada Revestida de Rubus Aprimorada x10",
      "Artefato dos Piratas Cox(Negociação de Alto Nível) x1",
      "Cristal de Pérola Pura x2",
      "Escultura de Recife Puro x8",
    ]));
    expect(QUESTS.some((quest) => /Ilha de Iliya Agitada (I|II|III)$/.test(quest.title))).toBe(false);
  });

  it("treats Kario quests as weekly and preserves the key Carrack yields", () => {
    const kario = QUEST_BY_ID["weekly-okilua-young-otters"];

    expect(kario?.cadence).toBe("weekly");
    expect(kario?.npc).toBe("Kario");
    expect(kario?.rewards).toEqual(expect.arrayContaining([
      "Caule de Alga Profunda x45",
      "Barra de Ouro do Mar Vermelho x15",
    ]));
    expect(MATERIAL_BY_ID.seaweedStalk.sources).toContainEqual(expect.objectContaining({ questId: kario.id, detail: expect.stringContaining("x45") }));
    expect(MATERIAL_BY_ID.redSeaGold.sources).toContainEqual(expect.objectContaining({ questId: kario.id, detail: expect.stringContaining("x15") }));
  });

  it("includes the permanent Terra do Amanhecer weeklies", () => {
    expect(QUEST_BY_ID["weekly-morning-light-panokseon"]?.rewards).toContain("Projeto: Panokseon x2");
    expect(QUEST_BY_ID["weekly-azure-silk-lyngbakr"]?.rewards).toContain("Moeda Corvo x500");
  });
});

describe("catálogo por NPC", () => {
  it("dá a toda missão um grupo com NPC, local e frequência", () => {
    expect(QUEST_GROUPS.length).toBeGreaterThan(0);
    expect(new Set(QUEST_GROUPS.map((group) => group.id))).toHaveLength(QUEST_GROUPS.length);

    for (const quest of QUESTS) {
      const group = QUEST_GROUP_BY_ID[quest.group];
      expect(group, quest.id).toBeDefined();
      expect(quest.npc).toBe(group.npc);
      expect(quest.location).toBe(group.location);
      expect(quest.cadence).toBe(group.cadence);
      expect(CADENCE_BY_ID[quest.cadence], quest.id).toBeDefined();
      expect(tracksOfGroup(group)).toContain(quest.track);
    }
  });

  it("agrupa cada NPC em uma frequência só, para a missão herdar os dados certos", () => {
    for (const group of QUEST_GROUPS) {
      expect(questsOfGroup(group).length, group.id).toBeGreaterThan(0);
      if (group.selection === "one-track") expect(tracksOfGroup(group).length, group.id).toBeGreaterThan(1);
      expect(tracksOfGroup(group), group.id).toContain(defaultTrackOf(group));
      for (const track of Object.keys(group.trackLabels ?? {})) expect(tracksOfGroup(group), group.id).toContain(track);
    }
  });

  it("liga toda fonte de missão a uma missão existente, com a mesma frequência", () => {
    const questSources = MATERIALS.flatMap((material) => material.sources).filter(isQuestAcquisition);

    expect(questSources.length).toBeGreaterThan(0);
    for (const source of questSources) {
      const quest = QUEST_BY_ID[source.questId];
      expect(quest, source.label).toBeDefined();
      expect(source.type).toBe(quest.cadence);
      // O rótulo da fonte repete o título da missão: impede que os dois textos divirjam.
      expect(source.label, source.questId).toContain(quest.title);
      expect(source.yield).toBeGreaterThan(0);
    }
  });

  it("mantém as regras de aceite do jogo nos grupos com alternativa", () => {
    const ravikel = QUEST_GROUP_BY_ID["okilua-ravikel-daily"];
    const herrad = QUEST_GROUP_BY_ID["okilua-herrad-daily"];

    expect(ravikel.selection).toBe("one-track");
    expect(QUEST_BY_ID["daily-okilua-young-sea-king"].track).toBe("rei-do-mar-jovem");
    for (const id of ["daily-okilua-kandidum", "daily-okilua-nineshark", "daily-okilua-black-rust"]) {
      expect(QUEST_BY_ID[id].track, id).toBe("cacadas-da-guilda");
    }

    expect(herrad.selection).toBe("one-track");
    expect(herrad.note).toContain("não podem ser aceitas ao mesmo tempo");
    expect(QUEST_BY_ID["daily-okilua-retribution-1"].track).not.toBe(QUEST_BY_ID["daily-okilua-retribution-2"].track);

    // Grupo documentado como acumulável continua sem exclusividade.
    expect(QUEST_GROUP_BY_ID["velia-mia-daily"].selection).toBe("all");
    expect(QUEST_GROUP_BY_ID["velia-mia-daily"].note).toContain("ao mesmo tempo");
  });
});

describe("missões que entram no cálculo", () => {
  it("começa com tudo ligado, menos a trilha que o jogo bloqueia", () => {
    const active = defaultActiveQuests();

    expect(Object.keys(active)).toHaveLength(QUESTS.length);
    expect(active["daily-okilua-young-sea-king"]).toBe(true);
    expect(active["daily-okilua-kandidum"]).toBe(false);
    expect(active["daily-okilua-nineshark"]).toBe(false);
    expect(active["daily-okilua-black-rust"]).toBe(false);
    expect(active["daily-okilua-retribution-1"]).toBe(true);
    expect(active["daily-okilua-retribution-2"]).toBe(false);
    // Fora dos grupos de trilha única, nada fica de fora por padrão.
    expect(QUESTS.filter((quest) => QUEST_GROUP_BY_ID[quest.group].selection === "all").every((quest) => active[quest.id])).toBe(true);
  });

  it("troca a trilha inteira ao ligar uma missão exclusiva", () => {
    const grupo = QUEST_GROUP_BY_ID["okilua-ravikel-daily"];
    const trocado = setQuestActive(defaultActiveQuests(), "daily-okilua-kandidum", true);

    expect(activeTrackOf(grupo, trocado)).toBe("cacadas-da-guilda");
    expect(trocado["daily-okilua-young-sea-king"]).toBe(false);
    // As irmãs da nova trilha entram junto: no jogo elas são aceitas no mesmo dia.
    expect(trocado["daily-okilua-nineshark"]).toBe(true);
    expect(trocado["daily-okilua-black-rust"]).toBe(true);

    const devolta = setQuestActive(trocado, "daily-okilua-young-sea-king", true);
    expect(activeTrackOf(grupo, devolta)).toBe("rei-do-mar-jovem");
    expect(devolta["daily-okilua-kandidum"]).toBe(false);
  });

  it("deixa desligar uma missão sozinha sem mexer nas outras", () => {
    const semNineshark = setQuestActive(setQuestActive(defaultActiveQuests(), "daily-okilua-kandidum", true), "daily-okilua-nineshark", false);

    expect(semNineshark["daily-okilua-nineshark"]).toBe(false);
    expect(semNineshark["daily-okilua-kandidum"]).toBe(true);

    // Um NPC pode ficar inteiro de fora da rotina.
    const semRavikel = questsOfGroup(QUEST_GROUP_BY_ID["okilua-ravikel-daily"])
      .reduce((active, quest) => setQuestActive(active, quest.id, false), defaultActiveQuests());
    expect(activeTrackOf(QUEST_GROUP_BY_ID["okilua-ravikel-daily"], semRavikel)).toBeNull();
  });

  it("normaliza estado salvo antigo, desconhecido ou inválido", () => {
    // Missão que não existe mais some; missão nova entra com o padrão do catálogo.
    const normalizado = normalizeActiveQuests({ "quest-de-evento-antiga": true, "daily-iliya-agitated": false });

    expect(normalizado["quest-de-evento-antiga"]).toBeUndefined();
    expect(normalizado["daily-iliya-agitated"]).toBe(false);
    expect(normalizado["daily-velia-baremi-goods"]).toBe(true);
    expect(Object.keys(normalizado)).toHaveLength(QUESTS.length);

    // Estado inconsistente não deixa duas trilhas ligadas no mesmo NPC.
    const duasTrilhas = normalizeActiveQuests({ "daily-okilua-young-sea-king": true, "daily-okilua-kandidum": true });
    expect(duasTrilhas["daily-okilua-young-sea-king"]).toBe(true);
    expect(duasTrilhas["daily-okilua-kandidum"]).toBe(false);

    expect(Object.keys(normalizeActiveQuests(null))).toHaveLength(QUESTS.length);
    expect(normalizeActiveQuests({ "daily-iliya-agitated": "sim" })["daily-iliya-agitated"]).toBe(true);
  });

  it("conta quantas missões de cada frequência estão na rotina do preset", () => {
    const profile = createInitialProfile("bravura");

    for (const cadence of QUEST_CADENCES) {
      const counts = questCounts(profile, cadence.id);
      expect(counts.total).toBe(QUESTS.filter((quest) => quest.cadence === cadence.id).length);
      expect(counts.active).toBeLessThanOrEqual(counts.total);
    }
    // As três caçadas da Guilda ficam fora até o jogador trocar de trilha.
    expect(questCounts(profile, "daily").active).toBe(questCounts(profile, "daily").total - 4);
    expect(isQuestActive(profile, "daily-okilua-young-sea-king")).toBe(true);
    expect(isQuestActive(profile, "daily-okilua-kandidum")).toBe(false);
  });
});

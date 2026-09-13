import { describe, expect, it } from "vitest";
import { MATERIAL_BY_ID, QUESTS } from "@/lib/data";

describe("current ocean quests", () => {
  it("keeps the complete daily and weekly catalog from the quest guide", () => {
    expect(QUESTS).toHaveLength(38);
    expect(QUESTS.filter((quest) => quest.cadence === "daily")).toHaveLength(27);
    expect(QUESTS.filter((quest) => quest.cadence === "weekly")).toHaveLength(11);
    expect(new Set(QUESTS.map((quest) => quest.id))).toHaveLength(QUESTS.length);
  });

  it("uses the consolidated Iliya quest and its current rewards", () => {
    const agitated = QUESTS.find((quest) => quest.id === "daily-iliya-agitated");

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
    const kario = QUESTS.find((quest) => quest.id === "weekly-okilua-young-otters");

    expect(kario?.cadence).toBe("weekly");
    expect(kario?.rewards).toEqual(expect.arrayContaining([
      "Caule de Alga Profunda x45",
      "Barra de Ouro do Mar Vermelho x15",
    ]));
    expect(MATERIAL_BY_ID.seaweedStalk.sources).toContainEqual(expect.objectContaining({ type: "weekly", detail: expect.stringContaining("x45") }));
    expect(MATERIAL_BY_ID.redSeaGold.sources).toContainEqual(expect.objectContaining({ type: "weekly", detail: expect.stringContaining("x15") }));
  });

  it("documents mutually exclusive and simultaneous mission rules", () => {
    expect(QUESTS.find((quest) => quest.id === "daily-okilua-retribution-1")?.note).toContain("não podem ser aceitas simultaneamente");
    expect(QUESTS.find((quest) => quest.id === "daily-velia-baremi-goods")?.note).toContain("Pode ficar ativa junto");
  });

  it("includes the permanent Terra do Amanhecer weeklies", () => {
    expect(QUESTS.find((quest) => quest.id === "weekly-morning-light-panokseon")?.rewards).toContain("Projeto: Panokseon x2");
    expect(QUESTS.find((quest) => quest.id === "weekly-azure-silk-lyngbakr")?.rewards).toContain("Moeda Corvo x500");
  });
});

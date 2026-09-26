import { describe, expect, it } from "vitest";
import { MATERIALS } from "@/lib/data";
import { materialFromSlug, materialPath, MATERIAL_SLUGS, materialUses } from "@/lib/materials";

describe("páginas de material", () => {
  it("dá a cada material um endereço único, pelo nome e sem acento", () => {
    const slugs = Object.values(MATERIAL_SLUGS);
    expect(new Set(slugs).size).toBe(MATERIALS.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(materialPath("brilliantPearl")).toBe("/material/cristal-de-perola-brilhante");
    expect(materialPath("coxCombat")).toBe("/material/artefato-dos-piratas-cox-combate");
  });

  it("volta do endereço para o material", () => {
    for (const m of MATERIALS) expect(materialFromSlug(MATERIAL_SLUGS[m.id])).toBe(m.id);
    expect(materialFromSlug("redSeaGold")).toBeNull();
  });
});

describe("onde o material é usado", () => {
  it("junta a mesma peça pedida por Carracas diferentes", () => {
    const uses = materialUses("purePearl");
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) expect(use.qty).toBeGreaterThan(0);
    const names = uses.map((use) => `${use.name}-${use.qty}`);
    expect(new Set(names).size).toBe(names.length);
  });

  it("aponta a construção da Carraca para material de construção", () => {
    expect(materialUses("abyssalEye")).toEqual([
      { name: "Construção da Carraca", qty: 42, carracks: ["gradual", "ascensao", "bravura"] },
      { name: "Construção da Carraca", qty: 50, carracks: ["equilibrio"] },
    ]);
  });

  it("não inventa uso para material só de aprimoramento", () => {
    expect(materialUses("waveStone")).toEqual([]);
  });
});

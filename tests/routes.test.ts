import { describe, expect, it } from "vitest";
import { CARRACK_ORDER, MATERIALS } from "@/lib/data";
import { accountNotice } from "@/lib/notices";
import { carrackFromSlug, carrackPath, PLANNER_PAGES, publicPaths, returnPath, tabOfPath } from "@/lib/routes";

const ORIGIN = "https://bdo-carrack-planner.vercel.app";

describe("páginas do planner", () => {
  it("liga cada aba a uma URL e de volta", () => {
    for (const page of PLANNER_PAGES) expect(tabOfPath(page.path)).toBe(page.tab);
    expect(tabOfPath("/missoes/")).toBe("quests");
    expect(tabOfPath("/carraca/gradual")).toBeNull();
  });

  it("dá título e descrição diferentes a cada página", () => {
    expect(new Set(PLANNER_PAGES.map((page) => page.title)).size).toBe(PLANNER_PAGES.length);
    expect(new Set(PLANNER_PAGES.map((page) => page.description)).size).toBe(PLANNER_PAGES.length);
  });

  it("tem uma página de guia por Carraca, com endereço pelo nome exibido", () => {
    for (const id of CARRACK_ORDER) expect(carrackFromSlug(carrackPath(id).split("/").pop()!)).toBe(id);
    expect(carrackPath("ascensao")).toBe("/carraca/emergencia");
    expect(carrackFromSlug("ascensao")).toBeNull();
  });

  it("publica no sitemap as seis abas, as quatro Carracas e cada material", () => {
    expect(publicPaths()).toHaveLength(10 + MATERIALS.length);
    expect(new Set(publicPaths()).size).toBe(publicPaths().length);
    expect(publicPaths()).toContain("/material/barra-de-cobalto-brilhante");
  });
});

describe("retorno do login", () => {
  it("devolve à página conhecida de onde o jogador veio", () => {
    expect(returnPath(`${ORIGIN}/missoes?conta=saiu`, ORIGIN)).toBe("/missoes");
    expect(returnPath(`${ORIGIN}/carraca/bravura`, ORIGIN)).toBe("/carraca/bravura");
    expect(returnPath(`${ORIGIN}/material/olho-abissal`, ORIGIN)).toBe("/material/olho-abissal");
    expect(returnPath("/estrategia", ORIGIN)).toBe("/estrategia");
  });

  it("nunca devolve para fora do site nem para caminho desconhecido", () => {
    expect(returnPath("https://example.com/missoes", ORIGIN)).toBe("/");
    expect(returnPath("//example.com/missoes", ORIGIN)).toBe("/");
    expect(returnPath(`${ORIGIN}/api/presets`, ORIGIN)).toBe("/");
    expect(returnPath("não é url", ORIGIN)).toBe("/");
    expect(returnPath(null, ORIGIN)).toBe("/");
  });

  it("traduz o aviso de conta da URL", () => {
    expect(accountNotice({ conta: "erro" })).toMatch(/Não foi possível entrar/);
    expect(accountNotice({ error: "access_denied" })).toMatch(/Não foi possível entrar/);
    expect(accountNotice({ conta: "entrou" })).toBeNull();
    expect(accountNotice({})).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { LOCAL_STORAGE_KEY, mergePending, planImport, shouldOfferImport, storageKeyFor } from "@/lib/sync";
import { authCodeFrom } from "@/lib/supabase/request";
import { createPreset } from "@/lib/profile";

function preset(id: string, name: string) {
  return createPreset(id, "bravura", name);
}

describe("escopo do armazenamento local", () => {
  it("separa o modo anônimo de cada conta", () => {
    expect(storageKeyFor(null)).toBe(LOCAL_STORAGE_KEY);
    expect(storageKeyFor("u1")).toBe(`${LOCAL_STORAGE_KEY}:u1`);
    expect(storageKeyFor("u1")).not.toBe(storageKeyFor("u2"));
  });
});

describe("fila de envio", () => {
  it("não repete identificador e mantém a ordem de chegada", () => {
    expect(mergePending(["a"], ["b", "a", "c"])).toEqual(["a", "b", "c"]);
    expect(mergePending([], [])).toEqual([]);
  });
});

describe("importação dos presets do navegador", () => {
  const newId = () => {
    let next = 0;
    return () => `novo-${++next}`;
  };

  it("cria identificadores novos para não sobrescrever o que já está na conta", () => {
    const local = [preset("local-1", "Bravura 1")];
    const remote = [preset("local-1", "Bravura da conta")];

    const imported = planImport(local, remote, newId());

    expect(imported[0].id).toBe("novo-1");
    expect(imported[0].id).not.toBe(local[0].id);
    expect(imported[0].profile).toEqual(local[0].profile);
  });

  it("desambigua nomes que já existem na conta", () => {
    const local = [preset("l1", "Bravura 1"), preset("l2", "Bravura 1")];
    const remote = [preset("r1", "Bravura 1")];

    const imported = planImport(local, remote, newId());

    expect(imported.map((item) => item.name)).toEqual(["Bravura 1 (importado)", "Bravura 1 (importado 2)"]);
  });

  it("mantém o nome quando não há conflito", () => {
    const imported = planImport([preset("l1", "Gradual 1")], [preset("r1", "Bravura 1")], newId());
    expect(imported[0].name).toBe("Gradual 1");
  });

  it("respeita o limite de 48 caracteres sem repetir o nome já ocupado", () => {
    // Nome já no limite: cortar o resultado inteiro devolveria sempre o mesmo texto e a busca
    // por um nome livre não terminaria.
    const longo = "N".repeat(48);
    const imported = planImport([preset("l1", longo), preset("l2", longo)], [preset("r1", longo)], newId());

    expect(imported[0].name.length).toBeLessThanOrEqual(48);
    expect(imported[1].name.length).toBeLessThanOrEqual(48);
    expect(imported[0].name).not.toBe(longo);
    expect(imported[0].name).not.toBe(imported[1].name);
  });

  it("só oferece importação com presets locais, conta e sem recusa anterior", () => {
    const local = [preset("l1", "Bravura 1")];
    expect(shouldOfferImport(local, "u1", [])).toBe(true);
    expect(shouldOfferImport(local, "u1", ["u1"])).toBe(false);
    expect(shouldOfferImport(local, "u1", ["u2"])).toBe(true);
    expect(shouldOfferImport([], "u1", [])).toBe(false);
    expect(shouldOfferImport(local, null, [])).toBe(false);
  });
});

describe("código de autorização fora do callback", () => {
  it("reconhece o código que o Supabase devolve na Site URL", () => {
    // Acontece quando o retorno pedido não está na lista de Redirect URLs: o código cai na
    // raiz, e sem isto o login terminaria sem sessão e sem aviso.
    expect(authCodeFrom({ code: "72ba46ac-8c34-4951-a98b-7ba2ae37ac0a" })).toBe("72ba46ac-8c34-4951-a98b-7ba2ae37ac0a");
  });

  it("ignora ausência, vazio e valor repetido", () => {
    expect(authCodeFrom({})).toBeNull();
    expect(authCodeFrom({ code: "" })).toBeNull();
    expect(authCodeFrom({ code: "   " })).toBeNull();
    expect(authCodeFrom({ code: ["a", "b"] })).toBeNull();
    expect(authCodeFrom({ conta: "entrou" })).toBeNull();
  });
});

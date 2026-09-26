import { describe, expect, it } from "vitest";
import { PRESET_SCHEMA_VERSION, hasNewerSchema, presetToRow, rowToPreset, writeVerdict } from "@/lib/schema";
import { createPreset } from "@/lib/profile";

describe("formato do preset na nuvem", () => {
  it("mantém o preset intacto na ida e na volta", () => {
    const preset = createPreset("11111111-1111-4111-8111-111111111111", "bravura", "Minha Bravura");
    preset.profile.materials.coxCombat = 12;
    preset.profile.crowCoins = 500;
    preset.completedQuests = { "daily-iliya-agitated": "2026-09-13" };

    const row = presetToRow(preset);
    expect(row.schema_version).toBe(PRESET_SCHEMA_VERSION);
    expect(rowToPreset(row, 0)).toEqual(preset);
  });

  it("normaliza o que vem do banco como faria com o armazenamento local", () => {
    const row = {
      id: "22222222-2222-4222-8222-222222222222",
      name: "  ",
      schema_version: PRESET_SCHEMA_VERSION,
      data: { profile: { crowCoins: -5, materials: { coxCombat: 7.9, inexistente: 3 } }, completedQuests: { naoExiste: "x" } },
    };

    const preset = rowToPreset(row, 4)!;
    expect(preset.name).toBe("Preset 5");
    expect(preset.profile.crowCoins).toBe(0);
    expect(preset.profile.materials.coxCombat).toBe(7);
    expect(preset.profile.materials).not.toHaveProperty("inexistente");
    expect(preset.completedQuests).toEqual({});
  });

  it("mantém acelerando quem foi salvo antes da escolha de gasto da Moeda Corvo", () => {
    const row = {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Bravura antiga",
      schema_version: PRESET_SCHEMA_VERSION - 1,
      data: { profile: { crowCoins: 50_000 }, completedQuests: {} },
    };

    // Acelerar material é o que o planner sempre fez; reservar 40.000 moedas em peças, não.
    expect(rowToPreset(row, 0)!.profile.crowSpend).toEqual({
      carrackParts: false, carrackPartCount: 4, blueGear: true, carrackMaterials: true,
    });
  });

  it("mantém o farm no prazo de quem foi salvo antes da escolha de rotina", () => {
    const row = {
      id: "66666666-6666-4666-8666-666666666666",
      name: "Bravura antiga",
      schema_version: PRESET_SCHEMA_VERSION - 1,
      data: { profile: { crowCoins: 1_000 }, completedQuests: {} },
    };

    expect(rowToPreset(row, 0)!.profile.farmRoutine).toEqual({ barter: true, hunt: true, workers: true });
  });

  it("deixa o equipamento amarelo fora da conta de quem foi salvo antes dele", () => {
    const row = {
      id: "88888888-8888-4888-8888-888888888888",
      name: "Bravura antiga",
      schema_version: PRESET_SCHEMA_VERSION - 1,
      data: { profile: { materials: { solidCoralSupport: 30 } }, completedQuests: {} },
    };

    const profile = rowToPreset(row, 0)!.profile;
    expect(profile.yellowGear.included).toBe(false);
    expect(profile.materials.solidCoralSupport).toBe(30);
  });

  it("guarda a rotina de farm escolhida no preset", () => {
    const row = {
      id: "77777777-7777-4777-8777-777777777777",
      name: "Só missões",
      schema_version: PRESET_SCHEMA_VERSION,
      data: { profile: { farmRoutine: { barter: false, hunt: false, market: true } }, completedQuests: {} },
    };

    expect(rowToPreset(row, 0)!.profile.farmRoutine).toEqual({ barter: false, hunt: false, workers: true });
  });

  it("limita a quantidade de peças verdes gravada em um preset", () => {
    const row = {
      id: "55555555-5555-4555-8555-555555555555",
      name: "Bravura",
      schema_version: PRESET_SCHEMA_VERSION,
      data: { profile: { crowSpend: { carrackParts: true, carrackPartCount: 9.7, blueGear: false } }, completedQuests: {} },
    };

    expect(rowToPreset(row, 0)!.profile.crowSpend).toEqual({
      carrackParts: true, carrackPartCount: 4, blueGear: false, carrackMaterials: true,
    });
  });

  it("descarta registro sem identificador", () => {
    expect(rowToPreset({ name: "Sem id", data: {} }, 0)).toBeNull();
    expect(rowToPreset(null, 0)).toBeNull();
  });

  it("grava a versão de quem produziu o dado, não a do servidor", () => {
    const preset = createPreset("33333333-3333-4333-8333-333333333333", "gradual", "Gradual 1");
    expect(presetToRow(preset, 4).schema_version).toBe(4);
  });
});

describe("regra de versão de formato", () => {
  it("aceita gravação quando o registro não existe", () => {
    expect(writeVerdict(null, PRESET_SCHEMA_VERSION)).toBe("ok");
  });

  it("aceita cliente igual ou mais novo que o registro", () => {
    expect(writeVerdict(PRESET_SCHEMA_VERSION, PRESET_SCHEMA_VERSION)).toBe("ok");
    expect(writeVerdict(PRESET_SCHEMA_VERSION - 1, PRESET_SCHEMA_VERSION)).toBe("ok");
  });

  it("recusa aba antiga gravando por cima de registro mais novo", () => {
    // É o caso que motiva a coluna: a versão antiga não conhece os campos novos e, ao
    // normalizar, os apagaria em silêncio.
    expect(writeVerdict(PRESET_SCHEMA_VERSION, PRESET_SCHEMA_VERSION - 1)).toBe("stale-client");
  });

  it("recusa versão que o servidor não reconhece", () => {
    expect(writeVerdict(null, PRESET_SCHEMA_VERSION + 1)).toBe("unknown-version");
    expect(writeVerdict(null, 0)).toBe("unknown-version");
    expect(writeVerdict(null, 1.5)).toBe("unknown-version");
  });

  it("detecta registro gravado por versão mais nova na leitura", () => {
    expect(hasNewerSchema([{ schema_version: PRESET_SCHEMA_VERSION }])).toBe(false);
    expect(hasNewerSchema([{ schema_version: PRESET_SCHEMA_VERSION + 1 }])).toBe(true);
    expect(hasNewerSchema([])).toBe(false);
  });
});

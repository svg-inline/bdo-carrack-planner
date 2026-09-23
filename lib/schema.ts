import { normalizePreset } from "@/lib/profile";
import type { PlannerPreset } from "@/types";

/**
 * Versão do formato de um preset. É a mesma usada pelo `persist` do Zustand e a que viaja
 * para o servidor: uma constante só para os dois lados não pode divergir.
 *
 * Suba este número sempre que o formato de `PlannerProfile` ou de `completedQuests` mudar de
 * um jeito que uma versão anterior do site não saiba preservar. `normalizeProfile` descarta
 * campos que não conhece, então um cliente antigo que gravasse por cima de um registro novo
 * devolveria o preset sem eles. É isso que a comparação de versão impede.
 */
export const PRESET_SCHEMA_VERSION = 9;

/** Um preset como ele existe na tabela `presets`. */
export interface PresetRow {
  id: string;
  name: string;
  schema_version: number;
  data: { profile: unknown; completedQuests: unknown };
}

/**
 * Parte do preset que vai para a coluna `data`; identificador e nome têm coluna própria.
 *
 * A versão gravada é a de quem produziu o dado, não a do servidor. Uma aba antiga que ainda
 * pode gravar declara a versão dela, e o próximo cliente atual reconhece que o registro está
 * atrasado e o normaliza na leitura.
 */
export function presetToRow(preset: PlannerPreset, version = PRESET_SCHEMA_VERSION): PresetRow {
  return {
    id: preset.id,
    name: preset.name,
    schema_version: version,
    data: { profile: preset.profile, completedQuests: preset.completedQuests },
  };
}

/**
 * Remonta o preset e passa pela mesma normalização do armazenamento local, porque o que vem
 * do banco merece a mesma desconfiança do que vem do navegador.
 */
export function rowToPreset(row: unknown, index: number): PlannerPreset | null {
  if (row === null || typeof row !== "object") return null;
  const { id, name, data } = row as Partial<PresetRow>;
  const content = data !== null && typeof data === "object" ? data : {};
  return normalizePreset({ id, name, ...content }, index);
}

export type WriteVerdict = "ok" | "stale-client" | "unknown-version";

/**
 * Decide se um cliente pode gravar por cima do registro que está no banco.
 *
 * Cliente mais antigo que o registro é recusado: ele não conhece os campos gravados pela
 * versão nova e os apagaria em silêncio. Cliente mais novo grava normalmente — a leitura já
 * normalizou o registro antigo, e esta gravação o traz para o formato atual.
 */
export function writeVerdict(rowVersion: number | null, clientVersion: number): WriteVerdict {
  if (!Number.isInteger(clientVersion) || clientVersion < 1 || clientVersion > PRESET_SCHEMA_VERSION) return "unknown-version";
  if (rowVersion !== null && clientVersion < rowVersion) return "stale-client";
  return "ok";
}

/**
 * Um registro gravado por uma versão mais nova do site significa que esta aba está velha:
 * ela ainda mostra o progresso, mas não pode enviar nada até a página ser atualizada.
 */
export function hasNewerSchema(rows: readonly { schema_version?: number }[], clientVersion = PRESET_SCHEMA_VERSION): boolean {
  return rows.some((row) => typeof row.schema_version === "number" && row.schema_version > clientVersion);
}

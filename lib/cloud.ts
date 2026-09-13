import { PRESET_SCHEMA_VERSION } from "@/lib/schema";
import type { PlannerPreset } from "@/types";

/** Resposta de `GET /api/presets`. */
export interface PresetsResponse {
  presets: PlannerPreset[];
  /** Algum registro foi gravado por uma versão mais nova do site do que esta aba. */
  outdated: boolean;
  schemaVersion: number;
}

export type CloudReason =
  | "sem-sessao"
  | "versao-desatualizada"
  | "limite-de-presets"
  | "banco-indisponivel"
  | "rede"
  | "desconhecido";

export class CloudError extends Error {
  constructor(readonly reason: CloudReason, readonly status: number) {
    super(reason);
    this.name = "CloudError";
  }
}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new CloudError("rede", 0);
  }

  const body = await response.json().catch(() => null) as { reason?: string } | null;
  if (response.ok) return body;

  const reason = typeof body?.reason === "string" ? body.reason : "desconhecido";
  throw new CloudError(reason as CloudReason, response.status);
}

export async function fetchPresets(): Promise<PresetsResponse> {
  return await call("/api/presets") as PresetsResponse;
}

export async function savePreset(preset: PlannerPreset): Promise<void> {
  await call(`/api/presets/${preset.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: preset.name,
      schemaVersion: PRESET_SCHEMA_VERSION,
      profile: preset.profile,
      completedQuests: preset.completedQuests,
    }),
  });
}

export async function deletePreset(id: string): Promise<void> {
  await call(`/api/presets/${id}`, { method: "DELETE" });
}

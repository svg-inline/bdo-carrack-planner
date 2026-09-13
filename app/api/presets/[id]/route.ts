import { PRESET_SCHEMA_VERSION, presetToRow, rowToPreset, writeVerdict } from "@/lib/schema";
import { PRESET_TABLE, fail, isPresetId, ok, requireAccount } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

/** Marca que o gatilho de limite de presets usa na mensagem da exceção. */
const LIMIT_MARKER = "preset_limit";

interface PutBody {
  name?: unknown;
  schemaVersion?: unknown;
  profile?: unknown;
  completedQuests?: unknown;
}

/**
 * Grava um preset inteiro. O corpo é normalizado pelas mesmas funções do armazenamento local,
 * porque dado vindo da rede merece a mesma desconfiança do que vem do navegador.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isPresetId(id)) return fail(400, "id-invalido");

  const account = await requireAccount();
  if (!account) return fail(401, "sem-sessao");

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return fail(400, "corpo-invalido");
  }

  const clientVersion = typeof body.schemaVersion === "number" ? body.schemaVersion : PRESET_SCHEMA_VERSION;
  const preset = rowToPreset({ id, name: body.name, data: { profile: body.profile, completedQuests: body.completedQuests } }, 0);
  if (!preset) return fail(400, "preset-invalido");

  const existing = await account.supabase
    .from(PRESET_TABLE)
    .select("schema_version")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) return fail(502, "banco-indisponivel");

  const verdict = writeVerdict(existing.data?.schema_version ?? null, clientVersion);
  // Uma aba aberta antes de uma publicação não pode regravar um preset que a versão nova já
  // salvou: ela apagaria os campos que não conhece. Ver ADR 0001, decisão 5.
  if (verdict === "stale-client") return fail(409, "versao-desatualizada");
  if (verdict === "unknown-version") return fail(400, "versao-desconhecida");

  const row = presetToRow(preset, clientVersion);
  const { error } = await account.supabase
    .from(PRESET_TABLE)
    .upsert({ ...row, user_id: account.userId, updated_at: new Date().toISOString() }, { onConflict: "user_id,id" });

  if (error) return error.message.includes(LIMIT_MARKER) ? fail(409, "limite-de-presets") : fail(502, "banco-indisponivel");
  return ok({ id, schemaVersion: clientVersion });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isPresetId(id)) return fail(400, "id-invalido");

  const account = await requireAccount();
  if (!account) return fail(401, "sem-sessao");

  const { error } = await account.supabase.from(PRESET_TABLE).delete().eq("id", id);
  if (error) return fail(502, "banco-indisponivel");
  return ok({ id });
}

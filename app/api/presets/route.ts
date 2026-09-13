import { PRESET_SCHEMA_VERSION, hasNewerSchema, rowToPreset } from "@/lib/schema";
import { PRESET_TABLE, fail, ok, requireAccount } from "@/lib/supabase/api";
import type { PresetsResponse } from "@/lib/cloud";
import type { PlannerPreset } from "@/types";

export const dynamic = "force-dynamic";

/** Todos os presets da conta. O RLS garante que nada de outra conta entra nesta lista. */
export async function GET() {
  const account = await requireAccount();
  if (!account) return fail(401, "sem-sessao");

  const { data, error } = await account.supabase
    .from(PRESET_TABLE)
    .select("id,name,schema_version,data")
    .order("updated_at", { ascending: true });

  if (error) return fail(502, "banco-indisponivel");

  const rows = data ?? [];
  const presets = rows.map(rowToPreset).filter((preset): preset is PlannerPreset => preset !== null);
  return ok<PresetsResponse>({ presets, outdated: hasNewerSchema(rows), schemaVersion: PRESET_SCHEMA_VERSION });
}

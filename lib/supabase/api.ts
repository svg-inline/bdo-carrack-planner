import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PRIVATE_HEADERS } from "@/lib/supabase/request";

export const PRESET_TABLE = "presets";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPresetId(value: string): boolean {
  return UUID.test(value);
}

export function fail(status: number, reason: string) {
  return NextResponse.json({ reason }, { status, headers: PRIVATE_HEADERS });
}

export function ok<T extends object>(body: T) {
  return NextResponse.json(body, { headers: PRIVATE_HEADERS });
}

/**
 * Sessão exigida pelas rotas de preset. O RLS já barraria o acesso de outra conta, mas
 * responder 401 aqui evita ida ao banco e deixa a interface distinguir "não logado" de "deu
 * erro" — são avisos diferentes para o jogador.
 */
export async function requireAccount(): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

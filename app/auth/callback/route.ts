import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

/**
 * Retorno do Discord, já passando pelo Supabase. Trocar o código pela sessão grava os cookies
 * aqui, numa Route Handler, que é onde o Next permite escrever.
 */
export async function GET(request: Request) {
  const origin = siteOrigin(request);
  const code = new URL(request.url).searchParams.get("code");

  if (!code || !isSupabaseConfigured()) return NextResponse.redirect(`${origin}/?conta=erro`, 303);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(error ? `${origin}/?conta=erro` : `${origin}/?conta=entrou`, 303);
}

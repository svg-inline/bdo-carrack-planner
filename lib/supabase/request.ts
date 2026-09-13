/**
 * Origem canônica do site. `SITE_URL` manda quando existe, porque é ela que está autorizada
 * na lista de retornos do Supabase; fora isso vale a origem da própria requisição.
 */
export function siteOrigin(request: Request): string {
  const configured = process.env.SITE_URL?.trim();
  return configured ? configured.replace(/\/+$/, "") : new URL(request.url).origin;
}

/**
 * Recusa POST vindo de outro site. Sem isso, uma página qualquer poderia deslogar o jogador
 * ou disparar um login pelas costas dele. Navegadores mandam `Origin` em envio de formulário,
 * então a checagem não atrapalha o caminho sem JavaScript.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin.replace(/\/+$/, "") === siteOrigin(request);
}

/** Respostas com dado de conta nunca podem ser guardadas por CDN ou proxy. */
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" } as const;

/**
 * Código de autorização que chegou numa rota que não é o callback.
 *
 * O Supabase devolve o código na Site URL quando o retorno pedido não está na lista de
 * Redirect URLs. Reconhecer isso na raiz evita que o login falhe em silêncio por uma
 * configuração incompleta — e evita a mesma armadilha ao trocar de domínio.
 *
 * Trocar um código forjado por sessão não funciona: a troca exige o verificador PKCE gravado
 * em cookie no início do login, que só existe no navegador de quem começou o fluxo.
 */
export function authCodeFrom(params: Record<string, string | string[] | undefined>): string | null {
  const code = params.code;
  return typeof code === "string" && code.trim() ? code : null;
}

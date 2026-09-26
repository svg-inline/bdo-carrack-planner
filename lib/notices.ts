/** Avisos que o login e a saída devolvem pela URL (`?conta=…`), em qualquer página. */
const ACCOUNT_NOTICES: Record<string, string> = {
  erro: "Não foi possível entrar na conta. Tente novamente.",
  indisponivel: "A conta está indisponível no momento. O progresso continua salvo neste navegador.",
  origem: "Pedido recusado porque não veio deste site.",
};

type Param = string | string[] | null | undefined;

/** O provedor também pode voltar com `error` em vez de código; sem isto o login falharia calado. */
export function accountNotice({ conta, error }: { conta?: Param; error?: Param }): string | null {
  const requested = typeof error === "string" ? "erro" : typeof conta === "string" ? conta : "";
  return ACCOUNT_NOTICES[requested] ?? null;
}

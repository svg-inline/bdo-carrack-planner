import Image from "next/image";
import type { Account } from "@/types";

export interface AccountBarProps {
  account: Account | null;
  enabled: boolean;
  notice?: string | null;
}

/**
 * Entrar e sair são formulários, não botões de JavaScript. É o que mantém a conta acessível
 * no guia sem JavaScript, junto com o resto da regra de ouro. Ver ADR 0001, decisão 2.
 */
export default function AccountBar({ account, enabled, notice = null }: AccountBarProps) {
  if (!enabled) return null;

  return <div className="account-bar">
    {account
      ? <>
          <span className="account-who">Progresso salvo na conta de <strong>{account.name}</strong></span>
          <form method="post" action="/auth/logout"><button className="button ghost" type="submit">Sair</button></form>
        </>
      : <>
          <span className="account-who">Entre para guardar o progresso na sua conta e continuar em outro aparelho.</span>
          <form method="post" action="/auth/login">
            <button className="button inline-flex items-center gap-2" type="submit">
              <Image src="/assets/discord.svg" alt="" aria-hidden="true" width={65} height={48} className="h-auto w-6 shrink-0" />
              Entrar com Discord
            </button>
          </form>
        </>}
    {notice ? <p className="account-notice" role="status">{notice}</p> : null}
  </div>;
}

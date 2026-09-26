import type { Metadata } from "next";

/**
 * Endereço público usado em sitemap, robots e URL canônica. Segue `SITE_URL` quando
 * configurada — a mesma variável que autoriza o retorno do login no Supabase.
 */
export const SITE_URL = (process.env.SITE_URL?.trim() || "https://bdo-carrack-planner.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "Carrack Ledger";

/**
 * Metadados de uma página: título, descrição, URL canônica e cartão de compartilhamento.
 * O Open Graph é repetido inteiro porque o de uma página substitui o do layout, em vez de
 * se somar a ele.
 */
export function pageMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "pt_BR", siteName: SITE_NAME, url: path, title, description },
  };
}

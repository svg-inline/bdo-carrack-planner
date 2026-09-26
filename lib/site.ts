import type { Metadata } from "next";

/**
 * Endereço público usado em sitemap, robots e URL canônica. Segue `SITE_URL` quando
 * configurada — a mesma variável que autoriza o retorno do login no Supabase.
 */
export const SITE_URL = (process.env.SITE_URL?.trim() || "https://bdo-carrack-planner.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "Carrack Ledger";

/**
 * Imagem dos links compartilhados no Discord, WhatsApp e redes. O fundo é a captura oficial do
 * Navio Mercante de Epheria, a mesma arte de `epheria-caravel.png`. Fica em `public`, e não no
 * arquivo `opengraph-image` do Next, porque o Open Graph de cada página substituiria a imagem.
 */
const SHARE_IMAGE = {
  url: "/assets/compartilhar.png",
  width: 1200,
  height: 630,
  alt: "Carrack Ledger: planejador das Carracas de Epheria do Black Desert",
};

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
    openGraph: { type: "website", locale: "pt_BR", siteName: SITE_NAME, url: path, title, description, images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}

/** Dados estruturados do site: o que ele é e a ferramenta que oferece, em qualquer página. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: "pt-BR" },
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: "Planejador das quatro Carracas de Epheria do Black Desert: inventário, materiais, equipamentos +10, missões do oceano e tempo estimado.",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
        isPartOf: { "@id": `${SITE_URL}/#site` },
      },
    ],
  };
}

/** Trilha de navegação de uma página, do início até ela. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${SITE_URL}${item.path}` })),
  };
}

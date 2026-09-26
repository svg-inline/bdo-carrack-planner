import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, pageMetadata, siteJsonLd, SITE_URL } from "@/lib/site";

describe("metadados para buscadores", () => {
  it("dá a cada página canônica, cartão de compartilhamento e imagem", () => {
    const meta = pageMetadata({ path: "/missoes", title: "Missões", description: "Catálogo" });
    expect(meta.alternates?.canonical).toBe("/missoes");
    expect(meta.openGraph).toMatchObject({ url: "/missoes", title: "Missões", locale: "pt_BR" });
    expect(meta.openGraph?.images).toEqual([expect.objectContaining({ url: "/assets/compartilhar.png", width: 1200, height: 630 })]);
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", images: meta.openGraph?.images });
  });

  it("descreve o site como aplicação gratuita em português", () => {
    const graph = siteJsonLd()["@graph"];
    expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "WebApplication"]);
    expect(graph[1]).toMatchObject({ inLanguage: "pt-BR", isAccessibleForFree: true, url: `${SITE_URL}/` });
  });

  it("monta a trilha de navegação com endereços absolutos e posições em ordem", () => {
    const trail = breadcrumbJsonLd([{ name: "Início", path: "/" }, { name: "Missões", path: "/missoes" }]);
    expect(trail.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Missões", item: `${SITE_URL}/missoes` },
    ]);
  });
});

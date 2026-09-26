import type { Metadata } from "next";
import JsonLd from "./json-ld";
import { SITE_NAME, SITE_URL, siteJsonLd } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — BDO`, template: `%s | ${SITE_NAME} — BDO` },
  description: "Planejador das quatro Carracas de Epheria com inventário, materiais, equipamentos +10 e rotas de obtenção.",
  verification: {
    google: "FyADmID3VgsxOrgiUwkdcEU3WVTKnKzCx4Fh9KHFVvA",
    other: { "msvalidate.01": "6B32F496D83C58177F70E69B2D425453" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><JsonLd data={siteJsonLd()} /><a href="#main-content" className="skip-link">Pular para o conteúdo</a>{children}</body>
    </html>
  );
}

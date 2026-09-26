import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const DESCRIPTION = "Planejador das quatro Carracas de Epheria com inventário, materiais, equipamentos +10 e rotas de obtenção.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Carrack Ledger — BDO",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "pt_BR", url: "/", siteName: "Carrack Ledger", title: "Carrack Ledger — BDO", description: DESCRIPTION },
  verification: {
    google: "FyADmID3VgsxOrgiUwkdcEU3WVTKnKzCx4Fh9KHFVvA",
    other: { "msvalidate.01": "6B32F496D83C58177F70E69B2D425453" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><a href="#main-content" className="skip-link">Pular para o conteúdo</a>{children}</body>
    </html>
  );
}

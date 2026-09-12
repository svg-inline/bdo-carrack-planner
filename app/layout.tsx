import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Carrack Ledger — BDO",
  description: "Planejador das quatro Carracas de Epheria com inventário, materiais, equipamentos +10 e rotas de obtenção.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><a href="#main-content" className="skip-link">Pular para o conteúdo</a>{children}</body>
    </html>
  );
}

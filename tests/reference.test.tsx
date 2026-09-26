// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CarrackGuide, CarrackSummaries, GuidePage, GuideShell, MaterialsTable, QuestsGuide, EstimateGuide, SourcesGuide, YellowGuide } from "@/app/reference";
import { pageOfTab } from "@/lib/routes";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-testid="optimized-image" aria-label={alt || undefined} />,
}));

describe("static planner guide", () => {
  it("liga todas as páginas do guia no menu", () => {
    render(<GuideShell account={null} accountEnabled={false}><p>conteúdo</p></GuideShell>);
    const nav = screen.getByRole("navigation", { name: "Guia de Carracas" });
    expect(nav.querySelectorAll("a")).toHaveLength(10);
    expect(screen.getByRole("link", { name: "Missões" })).toHaveAttribute("href", "/missoes");
    expect(screen.getByRole("link", { name: "Emergência" })).toHaveAttribute("href", "/carraca/emergencia");
  });

  it("dá a cada página o próprio título", () => {
    render(<GuidePage page={pageOfTab("quests")} notice={null}><QuestsGuide /></GuidePage>);
    expect(screen.getByRole("heading", { level: 1, name: "Missões do Oceano para a Carraca" })).toBeInTheDocument();
    expect(screen.getByText("12 missões diárias e 9 missões semanais em Ilha de Iliya, Velia, Olho da Okilua, Ilha da Seda Azure · Terra do Amanhecer, organizadas por NPC.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ravikel · Olho da Okilua · Diárias" })).toBeInTheDocument();
    expect(screen.getByText("Diária · [Permuta][Diário] Ilha de Iliya Agitada")).toBeInTheDocument();
    expect(screen.getByText("Semanal · [Semanal] Investigar a ecologia da área de Lyngbakr")).toBeInTheDocument();
  });

  it("mostra o aviso de conta devolvido pelo login", () => {
    render(<GuidePage page={pageOfTab("overview")} notice="Não foi possível entrar na conta. Tente novamente."><p /></GuidePage>);
    expect(screen.getByRole("status")).toHaveTextContent("Não foi possível entrar na conta.");
  });

  it("renders the critical content of each section without client state", () => {
    render(<><CarrackSummaries /><MaterialsTable /><SourcesGuide /><YellowGuide /><EstimateGuide /></>);
    expect(screen.getByRole("heading", { name: "Carraca de Epheria: Bravura" })).toBeInTheDocument();
    expect(screen.getAllByText(/Partindo do zero, os materiais da rota levam/)).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Materiais, receitas e equipamento da Bravura" })).toHaveAttribute("href", "/carraca/bravura");
    expect(screen.getByRole("columnheader", { name: "Emergência" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Materiais e onde conseguir" })).toBeInTheDocument();
    expect(screen.getByText("Peças de Falasi da Gradual")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Como o tempo é estimado" })).toBeInTheDocument();
  });

  it("mostra materiais e receitas no guia de uma Carraca", () => {
    render(<CarrackGuide id="gradual" />);
    expect(screen.getByText("Materiais e quantidades para Gradual")).toBeInTheDocument();
    expect(screen.getByText("Receitas dos quatro equipamentos azuis +10")).toBeInTheDocument();
    expect(screen.getByText("Equipamento azul de Shiro da Gradual")).toBeInTheDocument();
  });

  it("omite a barra de conta quando a sincronização não está configurada", () => {
    render(<GuideShell account={null} accountEnabled={false}><p /></GuideShell>);
    expect(screen.queryByRole("button", { name: "Entrar com Discord" })).not.toBeInTheDocument();
  });

  it("oferece login por formulário, que funciona sem JavaScript", () => {
    render(<GuideShell account={null} accountEnabled><p /></GuideShell>);
    const button = screen.getByRole("button", { name: "Entrar com Discord" });
    const form = button.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/auth/login");
  });

  it("mostra a conta e a saída quando há sessão", () => {
    render(<GuideShell account={{ id: "u1", name: "Marinheiro" }} accountEnabled><p /></GuideShell>);
    expect(screen.getByText("Marinheiro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" }).closest("form")).toHaveAttribute("action", "/auth/logout");
  });
});

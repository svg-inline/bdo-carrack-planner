// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Reference from "@/app/reference";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span data-testid="optimized-image" aria-label={alt || undefined} />,
}));

describe("static planner guide", () => {
  it("renders the critical content without client state", () => {
    render(<Reference account={null} accountEnabled={false} notice={null} />);
    expect(screen.getByRole("heading", { name: "Planejador das Carracas de Epheria" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carraca de Epheria: Bravura" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Materiais e onde conseguir" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Guia de Carracas" })).toBeInTheDocument();
    expect(screen.getByText("12 missões diárias e 9 missões semanais em Ilha de Iliya, Velia, Olho da Okilua, Ilha da Seda Azure · Terra do Amanhecer, organizadas por NPC.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ravikel · Olho da Okilua · Diárias" })).toBeInTheDocument();
    expect(screen.getByText("Diária · [Permuta][Diário] Ilha de Iliya Agitada")).toBeInTheDocument();
    expect(screen.getByText("Semanal · [Semanal] Investigar a ecologia da área de Lyngbakr")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Como o tempo é estimado" })).toBeInTheDocument();
    expect(screen.getAllByText(/Partindo do zero, os materiais da rota levam/)).toHaveLength(4);
  });

  it("omite a barra de conta quando a sincronização não está configurada", () => {
    render(<Reference account={null} accountEnabled={false} notice={null} />);
    expect(screen.queryByRole("button", { name: "Entrar com Discord" })).not.toBeInTheDocument();
  });

  it("oferece login por formulário, que funciona sem JavaScript", () => {
    render(<Reference account={null} accountEnabled notice={null} />);
    const button = screen.getByRole("button", { name: "Entrar com Discord" });
    const form = button.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("action", "/auth/login");
  });

  it("mostra a conta e a saída quando há sessão", () => {
    render(<Reference account={{ id: "u1", name: "Marinheiro" }} accountEnabled notice={null} />);
    expect(screen.getByText("Marinheiro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" }).closest("form")).toHaveAttribute("action", "/auth/logout");
  });
});

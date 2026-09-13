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
    render(<Reference />);
    expect(screen.getByRole("heading", { name: "Planejador das Carracas de Epheria" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carraca de Epheria: Bravura" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Materiais e onde conseguir" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Guia de Carracas" })).toBeInTheDocument();
    expect(screen.getByText("27 missões diárias e 11 semanais em Iliya, Velia, Olho da Okilua e Terra do Amanhecer.")).toBeInTheDocument();
    expect(screen.getByText("Diária · [Permuta][Diário] Ilha de Iliya Agitada")).toBeInTheDocument();
    expect(screen.getByText("Semanal · Investigar a ecologia da área de Lyngbakr")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Como o tempo é estimado" })).toBeInTheDocument();
    expect(screen.getAllByText(/Partindo do zero, os materiais da rota levam/)).toHaveLength(4);
  });
});

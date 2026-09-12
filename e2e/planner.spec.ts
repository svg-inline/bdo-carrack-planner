import { expect, test } from "@playwright/test";

test("works as a useful guide without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Planejador das Carracas de Epheria" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Carraca de Epheria: Bravura" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Materiais e onde conseguir" })).toBeVisible();
  await context.close();
});

test("onboards and persists the critical planner flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Prepare sua Carraca" })).toBeVisible();
  await page.getByRole("button", { name: /Gradual/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Montar meu plano" }).click();
  await expect(page.getByRole("heading", { name: "Rota para sua Carraca" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Rota para sua Carraca" })).toBeVisible();
});

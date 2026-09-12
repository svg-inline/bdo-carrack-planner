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

test("creates different and repeated presets with independent persisted progress", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Qual Carraca você quer planejar?" })).toBeVisible();
  await page.getByRole("button", { name: /Bravura/ }).click();
  await expect(page.getByRole("heading", { name: "Rota para sua Carraca" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Passe" })).toHaveCount(0);

  await page.getByRole("button", { name: "Inventário" }).click();
  const combatStock = page.getByRole("spinbutton", { name: /Estoque de Artefato dos Piratas Cox.*Combate/ });
  await combatStock.fill("12");

  await page.getByRole("button", { name: /Adicionar preset/ }).click();
  await page.getByRole("button", { name: /Gradual/ }).click();
  await page.getByRole("button", { name: /Adicionar preset/ }).click();
  await page.getByRole("button", { name: /Bravura/ }).click();
  await expect(page.getByLabel("Preset ativo")).toHaveValue(/.+/);

  await page.getByRole("button", { name: "Inventário" }).click();
  await expect(combatStock).toHaveValue("0");
  await page.getByLabel("Preset ativo").selectOption({ label: "Bravura 1" });
  await expect(combatStock).toHaveValue("12");
  await page.reload();
  await expect(page.getByLabel("Preset ativo")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Inventário" }).click();
  await expect(combatStock).toHaveValue("12");
});
